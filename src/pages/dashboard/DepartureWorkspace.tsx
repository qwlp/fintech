import { useState } from "react";
import { ArrowRight, Check, FileCheck2 } from "lucide-react";
import { convertMoney, convertMoneyText } from "../../../shared/currency";
import { useWorkspaceCurrency, useWorkspaceMoney } from "../../components/WorkspaceCurrency";
import type { DatabaseState, Page } from "../../types/database";

function WorkspaceHeader({
  number,
  title,
  description,
  tabs,
  active,
  setActive,
}: {
  number: number;
  title: string;
  description: string;
  tabs: string[];
  active: string;
  setActive: (tab: string) => void;
}) {
  return (
    <>
      <section className="workspace-title">
        <div><h2>{title}</h2></div>
      </section>
      <nav className="workspace-tabs" aria-label={`${title} views`}>
        {tabs.map((tab) => (
          <button
            className={active === tab ? "active" : ""}
            aria-pressed={active === tab}
            onClick={() => setActive(tab)}
            key={tab}
          >
            {tab}
          </button>
        ))}
      </nav>
    </>
  );
}

export function DepartureWorkspace({
  go,
  storedTasks,
  onToggle,
  config,
}: {
  go: (p: Page) => void;
  storedTasks?: DatabaseState["checklist"];
  onToggle: (key: string) => void;
  config?: any;
}) {
  const currency = useWorkspaceCurrency();
  const formatMoney = useWorkspaceMoney();
  const [tab, setTab] = useState("Checklist");
  const [tasks, setTasks] = useState([true, true, false, false]);

  const taskData =
    storedTasks ??
    [
      ["visa", "Visa fee paid", "Receipt verified", true],
      ["housing", "Housing deposit reserved", convertMoneyText("£1,300 set aside", "GBP", currency), true],
      ["tuition", "Tuition instalment prepared", "Due in 12 days", false],
      ["emergency", "Emergency fund completed", convertMoneyText("£2,700 gap remains", "GBP", currency), false],
    ].map(([key, label, detail, done]) => ({
      key: key as string,
      label: label as string,
      detail: detail as string,
      done: done as boolean,
    }));

  const taskValues = storedTasks?.map((x) => x.done) ?? tasks;
  const toggle = (key: string, i: number) =>
    storedTasks
      ? onToggle(key)
      : setTasks((items) => items.map((v, j) => (i === j ? !v : v)));

  return (
    <div className="workspace">
      <WorkspaceHeader
        number={5}
        title="Departure control"
        description="One place for the money, documents, and deadlines required before you fly."
        tabs={["Checklist", "Documents", "Deadlines"]}
        active={tab}
        setActive={setTab}
      />
      {tab === "Checklist" && (
        <div className="departure-grid">
          <section className="departure-score">
            <strong>
              {taskValues.filter(Boolean).length}/{taskValues.length}
            </strong>
            <span>financial tasks complete</span>
            <div>
              {taskValues.map((done, i) => (
                <i className={done ? "done" : ""} key={i} />
              ))}
            </div>
            <p>
              Next required action: prepare the{" "}
              {formatMoney(convertMoney(2000, "GBP", currency))} tuition instalment.
            </p>
            <button onClick={() => go("Payments")}>
              Review payment <ArrowRight />
            </button>
          </section>
          <section className="departure-tasks">
            {taskData.map((task, i) => (
              <button key={task.key} onClick={() => toggle(task.key, i)}>
                <i className={taskValues[i] ? "checked" : ""}>
                  {taskValues[i] && <Check />}
                </i>
                <span>
                  <strong>{task.label}</strong>
                  <small>{task.detail}</small>
                </span>
              </button>
            ))}
          </section>
        </div>
      )}
      {tab === "Documents" && (
        <section className="document-list">
          {(config?.documents ?? []).map((x: string[]) => (
            <div key={x[0]}>
              <FileCheck2 />
              <span>
                <strong>{x[0]}</strong>
                <small>{x[2]}</small>
              </span>
              <em className={x[1] === "Missing" ? "missing" : ""}>{x[1]}</em>
            </div>
          ))}
        </section>
      )}
      {tab === "Deadlines" && (
        <section className="deadline-track">
          {(config?.deadlines ?? []).map((item: string[]) => (
            <div key={item[0] + item[1]}>
              <time>{item[0]}</time>
              <span>
                <strong>{item[1]}</strong>
                <small>{item[2]}</small>
              </span>
              {item[3] && <b>{item[3]}</b>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
