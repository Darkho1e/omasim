import React, { useEffect, useState } from "react";

const HelloUser = ({ userName }) => {
  const [greeting, setGreeting] = useState("");
  const [emoji, setEmoji] = useState("👋");

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting("בוקר טוב");
      setEmoji("🌞");
    } else if (currentHour >= 12 && currentHour < 17) {
      setGreeting("צהריים טובים");
      setEmoji("🍽️");
    } else if (currentHour >= 17 && currentHour < 21) {
      setGreeting("ערב טוב");
      setEmoji("🌇");
    } else {
      setGreeting("לילה טוב");
      setEmoji("🌙");
    }
  }, []);

  return (
    <h2 style={{ fontSize: "24px", fontWeight: "bold", textAlign: "center", color: "#1E293B" }}>
      {emoji} {greeting}, {userName || "משתמש"}! 

      
    </h2>
  );
};

export default HelloUser;
