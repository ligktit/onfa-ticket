import React, { useState } from "react";
import RegistrationForm from "../components/RegistrationForm";
import TicketView from "../components/TicketView";

const ClientApp = () => {
  const [registeredTicket, setRegisteredTicket] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans py-4 sm:py-6 md:py-8">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1200px]">

        {registeredTicket ? (
          <TicketView
            ticket={registeredTicket}
            onClose={() => {
              setRegisteredTicket(null);
            }}
          />
        ) : (
          <RegistrationForm
            onSuccess={(ticket) => {
              setRegisteredTicket(ticket);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ClientApp;
