// SSE endpoint using Edge Runtime for Vercel
// Proxies SSE connection to backend server
// Edge Runtime supports streaming and can proxy HTTP requests

export const config = {
  runtime: 'edge', // Use Edge Runtime for better streaming support
};

export default async function handler(req) {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
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
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get backend URL from environment variable
  // Edge Runtime: Use env from Vercel environment variables
  // Access via process.env in Edge Runtime (Vercel injects these)
  const backendUrl = process.env.BACKEND_URL || 
                     process.env.VITE_API_URL || 
                     'http://localhost:5000';
  
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
          // Send error message to client
          const errorMessage = `data: ${JSON.stringify({ type: 'error', message: error.message || 'Connection error' })}\n\n`;
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
