import React from "react";

const StatCard = ({ label, value, color }) => {
  const colors = {
    yellow: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
    blue: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
    green: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
    purple: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
  };
  return (
    <div
      className={`${colors[color]} backdrop-blur-sm border-2 rounded-lg p-4 text-center`}
    >
      <div className="text-sm font-semibold mb-1 text-yellow-300">{label}</div>
      <div className="text-yellow-400 text-2xl font-bold">{value}</div>
    </div>
  );
};

export default StatCard;
