// SSE endpoint using Edge Runtime for Vercel
// Proxies SSE connection to backend server
// Edge Runtime supports streaming and can proxy HTTP requests

export const config = {
  runtime: 'edge', // Use Edge Runtime for better streaming support
};

export default async function handler(request) {
  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get backend URL from environment variable
  // Edge Runtime: Vercel injects env vars - access via process.env
  // Note: In Edge Runtime, env vars are available at build time
  const backendUrl = process.env.BACKEND_URL || 
                     process.env.VITE_API_URL || 
                     null;
  
  // If no backend URL is configured, return helpful error
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ 
        type: 'error', 
        message: 'Backend URL not configured. Please set BACKEND_URL environment variable in Vercel.' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  
  const backendBaseUrl = backendUrl.replace(/\/api$/, ''); // Remove /api suffix if present
  const backendSSEUrl = `${backendBaseUrl}/api/events`;

  try {
    // Create a ReadableStream that proxies to backend SSE endpoint
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let backendStream = null;
        let reader = null;

        try {
          // Connect to backend SSE endpoint
          const response = await fetch(backendSSEUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
          });

          if (!response.ok) {
            throw new Error(`Backend SSE endpoint returned ${response.status}`);
          }

          backendStream = response.body;
          if (!backendStream) {
            throw new Error('Backend response has no body');
          }

          reader = backendStream.getReader();
          const decoder = new TextDecoder();

          // Send initial connection message
          const initialMessage = `data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established (Edge Runtime Proxy)' })}\n\n`;
          controller.enqueue(encoder.encode(initialMessage));

          // Read and forward messages from backend
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Backend stream ended
              break;
            }

            // Decode and forward the chunk
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          // Send error message to client with more details
          const errorDetails = {
            type: 'error',
            message: error.message || 'Connection error',
            backendUrl: backendSSEUrl,
            errorType: error.name || 'UnknownError'
          };
          
          // If it's a network error, provide more helpful message
          if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
            errorDetails.message = `Cannot connect to backend server at ${backendBaseUrl}. Please check BACKEND_URL environment variable.`;
            errorDetails.suggestion = 'Ensure your backend is deployed and accessible from Vercel Edge Runtime.';
          }
          
          const errorMessage = `data: ${JSON.stringify(errorDetails)}\n\n`;
          try {
            controller.enqueue(encoder.encode(errorMessage));
          } catch (e) {
            // Controller might be closed, ignore
          }
        } finally {
          // Cleanup
          if (reader) {
            try {
              await reader.cancel();
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to establish SSE connection', message: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
