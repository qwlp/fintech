import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Input } from "../src/components/ui/input";
import "../src/styles.css";
import "../src/components/ui/ui.css";
function Preview() {
  const [amount, setAmount] = useState("1000.50");
  const [numeric, setNumeric] = useState(1000);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label>
        Contribution
        <Input
          money
          required
          min={0.01}
          max={1000000}
          aria-label="Contribution"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label>
        Numeric amount
        <Input
          money
          aria-label="Numeric amount"
          value={numeric}
          onChange={(event) => setNumeric(Number(event.target.value))}
        />
      </label>
      <output>{amount}</output>
      <button>Save</button>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
