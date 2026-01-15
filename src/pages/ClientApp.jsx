import React, { useState } from "react";
import RegistrationForm from "../components/RegistrationForm";
import TicketView from "../components/TicketView";

const ClientApp = () => {
  const [registeredTicket, setRegisteredTicket] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans py-4 sm:py-6 md:py-8">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1200px]">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-yellow-400 mb-2">🎉 ONFA TICKET</h1>
          <p className="text-yellow-300 text-sm sm:text-base md:text-lg">Hệ thống đăng ký vé sự kiện</p>
        </div>

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
