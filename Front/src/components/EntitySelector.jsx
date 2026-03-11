import { useState } from "react";

export default function EntitySelector() {

  const [scope, setScope] = useState("brand");

  const [selectedPerson, setSelectedPerson] = useState("");

  const persons = [
    "Travis Scott",
    "Michael Jordan",
    "Elon Musk",
    "Lee Jae-yong"
  ];

  return (
    <div className="mt-6 flex flex-col gap-4">

      {/* Scope Selector */}
      <div className="flex items-center gap-3">

        <span className="text-sm font-semibold text-slate-600">
          Scope
        </span>

        <div className="flex bg-white/50 backdrop-blur rounded-xl border border-white/40 p-1">

          <button
            onClick={() => setScope("brand")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition
              ${scope === "brand"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-white/60"
              }`}
          >
            Brand
          </button>

          <button
            onClick={() => setScope("person")}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition
              ${scope === "person"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-white/60"
              }`}
          >
            Person
          </button>

        </div>
      </div>


      {/* Person Dropdown */}
      {scope === "person" && (

        <div className="flex items-center gap-3">

          <span className="text-sm font-semibold text-slate-600">
            Person
          </span>

          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/70 border border-white/50 backdrop-blur text-sm font-semibold text-slate-800"
          >

            <option value="">
              Select person
            </option>

            {persons.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}

          </select>

        </div>

      )}

    </div>
  );
}