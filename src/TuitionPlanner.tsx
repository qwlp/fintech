import InfoHelp from "./InfoHelp";
import { useState } from "react";
import {
  Check,
  CreditCard,
  Landmark,
  Send,
  ChevronDown,
  GraduationCap,
  Globe2,
  ReceiptText,
  FileCheck2,
  ArrowLeftRight,
  Clock3,
  CircleDollarSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./components/ui/select";
import {
  tuitionEstimates,
  universities,
  type TuitionCountry,
  type TuitionRoute,
} from "./lib/tuition";
const formatUSD = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const countries: TuitionCountry[] = ["US", "UK", "China"];
const range = (values: number[]) =>
  values[0] === values[1]
    ? formatUSD(values[0])
    : `${formatUSD(values[0])}–${formatUSD(values[1])}`;

export default function TuitionPlanner() {
  const [origin, setOrigin] = useState<TuitionCountry>("US");
  const [destination, setDestination] = useState<TuitionCountry>("UK");
  const [university, setUniversity] = useState(universities.UK[0]);
  const [amountText, setAmountText] = useState("50000");
  const [localAccount, setLocalAccount] = useState(false);
  const [selected, setSelected] = useState<TuitionRoute>("bank");
  const [showDetails, setShowDetails] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const amount = Number(amountText);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 10000000;
  const estimates = tuitionEstimates(
    origin,
    destination,
    valid ? amount : 0,
    localAccount,
  );
  const route = estimates.find((r) => r.id === selected)!;
  const cost = route.fee.map((fee, i) => fee + route.fx[i]);
  const documents = [
    "Tuition invoice",
    "Student ID / payment reference",
    "Identity document",
    ...(origin === "China"
      ? ["Admission letter and I-20 / CAS, if required"]
      : []),
  ];

  return (
    <section className="tuition-planner" aria-label="Tuition payments">
      <div className="tuition-heading">
        <span className="tuition-heading-icon">
          <GraduationCap size={24} />
        </span>
        <div>
          <h2>Tuition payments</h2>
        </div>
      </div>
      <div className="tuition-layout">
        <Card>
          <CardHeader>
            <CardTitle>
              <Globe2 size={17} /> Where to?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tuition-fields">
              <div>
                <label htmlFor="tuition-origin">From</label>
                <Select
                  value={origin}
                  onValueChange={(value) => {
                    setOrigin(value as TuitionCountry);
                    setLocalAccount(false);
                    setChecked([]);
                  }}
                >
                  <SelectTrigger id="tuition-origin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="ui-select-content">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="tuition-destination">To</label>
                <Select
                  value={destination}
                  onValueChange={(value) => {
                    const country = value as TuitionCountry;
                    setDestination(country);
                    setUniversity(universities[country][0]);
                    setLocalAccount(false);
                    setChecked([]);
                  }}
                >
                  <SelectTrigger id="tuition-destination">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="ui-select-content">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="tuition-field-wide">
                <label htmlFor="tuition-university">University</label>
                <Select value={university} onValueChange={setUniversity}>
                  <SelectTrigger id="tuition-university">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="ui-select-content">
                    {universities[destination].map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="tuition-field-wide">
                <label htmlFor="tuition-amount">
                  Amount{" "}
                  <span className="tuition-currency">USD equivalent</span>
                </label>
                <Input
                  id="tuition-amount"
                  money
                  min="1"
                  max="10000000"

                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value)}
                  aria-invalid={!valid}
                />
                {!valid && (
                  <p role="alert" className="fx-error">
                    Enter an amount greater than zero, up to $10 million.
                  </p>
                )}
              </div>
            </div>
            {origin !== "China" && origin !== destination && (
              <label className="tuition-check">
                <Checkbox
                  checked={localAccount}
                  onCheckedChange={(value) => setLocalAccount(value === true)}
                />
                <Landmark size={14} /> Local account in {destination}{" "}
                <InfoHelp term="Local account" />
              </label>
            )}
            <h3 className="tuition-method-title">Payment method</h3>
            <div
              className="tuition-methods"
              role="group"
              aria-label="Payment method"
            >
              {estimates.map((item, index) => {
                const Icon = [Landmark, Send, CreditCard][index];
                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    className={`tuition-method ${selected === item.id ? "selected" : ""}`}
                    aria-pressed={selected === item.id}
                    onClick={() => setSelected(item.id)}
                  >
                    <Icon />
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        <Clock3 size={11} />
                        {item.id === "bank"
                          ? localAccount || origin === destination
                            ? "0–2 days"
                            : "3–7 days"
                          : item.id === "platform"
                            ? "2–3 days"
                            : "Within 24h"}
                      </small>
                    </span>
                    <span className="tuition-method-cost">
                      {valid
                        ? range(item.fee.map((fee, i) => fee + item.fx[i]))
                        : "—"}
                      <small>fees + FX</small>
                    </span>
                    {selected === item.id && <Check />}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <div>
          <Card className="tuition-review">
            <CardHeader>
              <CardTitle>
                <ReceiptText size={17} /> Estimated total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="tuition-total">
                {valid ? range(cost.map((value) => value + amount)) : "—"}
              </strong>
              <dl className="tuition-breakdown">
                <div>
                  <dt>
                    <GraduationCap size={14} /> Tuition
                  </dt>
                  <dd>{valid ? formatUSD(amount) : "—"}</dd>
                </div>
                <div>
                  <dt>
                    <CircleDollarSign size={14} /> Fee
                  </dt>
                  <dd>{valid ? range(route.fee) : "—"}</dd>
                </div>
                <div>
                  <dt>
                    <ArrowLeftRight size={14} /> FX
                  </dt>
                  <dd>{valid ? range(route.fx) : "—"}</dd>
                </div>
              </dl>
              <p className="tuition-caption">
                USD estimate · Confirm with your university.
              </p>
              <Button
                variant="secondary"
                className="tuition-more"
                aria-expanded={showDetails}
                aria-controls="tuition-extra"
                onClick={() => setShowDetails((value) => !value)}
              >
                <FileCheck2 size={16} /> Checklist
                <ChevronDown className={showDetails ? "rotate-180" : ""} />
              </Button>
              {showDetails && (
                <div id="tuition-extra" className="tuition-extra">
                  <p>{route.note}</p>
                  {origin === "China" && (
                    <p>
                      For large tuition payments, ask your bank or university’s
                      RMB payment partner about education remittance eligibility
                      and required documents.
                    </p>
                  )}
                  {origin === "US" && destination !== "US" && (
                    <p>
                      Use a US bank account or US-issued card to qualify for the{" "}
                      <a
                        href="https://uscode.house.gov/view.xhtml?req=(title:26%20section:4475%20edition:prelim)"
                        target="_blank"
                        rel="noreferrer"
                      >
                        remittance tax exemption
                      </a>
                      .
                    </p>
                  )}
                  {destination === "UK" && (
                    <p>
                      Applying for a visa? Check the{" "}
                      <a
                        href="https://www.gov.uk/student-visa/money"
                        target="_blank"
                        rel="noreferrer"
                      >
                        28-day funds requirement
                      </a>{" "}
                      before paying.
                    </p>
                  )}
                  {documents.map((document) => (
                    <label className="tuition-check" key={document}>
                      <Checkbox
                        checked={checked.includes(document)}
                        onCheckedChange={(value) =>
                          setChecked((previous) =>
                            value === true
                              ? [...previous, document]
                              : previous.filter((item) => item !== document),
                          )
                        }
                      />
                      {document}
                    </label>
                  ))}
                  <p className="tuition-caption">
                    Checklist stays in this session. No documents are uploaded.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
