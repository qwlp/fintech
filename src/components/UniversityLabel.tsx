import { useState } from "react";
import { GraduationCap } from "lucide-react";
import "../styles/university-logos.css";

const logos: Record<string, string> = {
  "Tsinghua University": "tsinghua.ico",
  "Peking University": "peking.png",
  "Zhejiang University": "zhejiang.png",
  "King's College London": "kcl.svg",
  "University of Manchester": "manchester.png",
  "University of Edinburgh": "edinburgh.ico",
  "Columbia University": "columbia.png",
  "University of Southern California": "usc.png",
  UCLA: "ucla.png",
  "University of California, Los Angeles": "ucla.png",
};

function UniversityLogo({ logo }: { logo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="university-logo" aria-hidden="true">
      {failed ? (
        <GraduationCap size={18} />
      ) : (
        <img
          src={`/university-logos/${logo}`}
          alt=""
          width={28}
          height={28}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export default function UniversityLabel({ name }: { name: string }) {
  const logo = logos[name.replaceAll("’", "'")];
  if (!logo) return <>{name}</>;
  return (
    <span className="university-label">
      <UniversityLogo key={logo} logo={logo} />
      <span className="university-label-name">{name}</span>
    </span>
  );
}
