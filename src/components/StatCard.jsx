import React from "react";

const StatCard = ({ label, value, color }) => {
  const colors = {
    yellow: {
      bg: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10",
      border: "border-yellow-400",
      text: "text-yellow-300",
      value: "text-yellow-400",
      shadow: "shadow-lg shadow-yellow-500/20"
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      border: "border-blue-400",
      text: "text-blue-300",
      value: "text-blue-400",
      shadow: "shadow-lg shadow-blue-500/20"
    },
    green: {
      bg: "bg-gradient-to-br from-green-500/20 to-green-600/10",
      border: "border-green-400",
      text: "text-green-300",
      value: "text-green-400",
      shadow: "shadow-lg shadow-green-500/20"
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
      border: "border-purple-400",
      text: "text-purple-300",
      value: "text-purple-400",
      shadow: "shadow-lg shadow-purple-500/20"
    },
  };
  
  const colorConfig = colors[color] || colors.yellow;
  
  return (
    <div
      className={`${colorConfig.bg} ${colorConfig.border} ${colorConfig.shadow} backdrop-blur-md border-2 rounded-xl p-4 sm:p-5 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl`}
    >
      <div className={`text-xs sm:text-sm font-semibold mb-2 ${colorConfig.text}`}>{label}</div>
      <div className={`${colorConfig.value} text-2xl sm:text-3xl font-bold`}>{value}</div>
    </div>
  );
};

export default StatCard;
