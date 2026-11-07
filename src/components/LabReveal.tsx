import { useState } from "react";
import FleetMap, { type MapLink, type MapPerson } from "@/components/FleetMap";
import { placeById } from "@/lib/campus";

const AGIRA = placeById("agira-hall");
const PRITHVI = placeById("prithvi-hall");
const LIBRARY = placeById("library");
const AUDI = placeById("auditorium");

export function AlgoDrawer({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-3xl bg-white shadow-sm">
      <button className="flex w-full items-center justify-between px-6 py-5 text-left" onClick={() => setOpen((value) => !value)}>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Algorithm</span>
          <span className="mt-1 block text-lg font-semibold">{title}</span>
        </span>
        <span className="text-sm font-medium text-gray-500">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <dl className="grid gap-6 border-t border-gray-100 px-6 py-5 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{row.label}</dt>
              <dd className="mt-2 text-sm leading-6 text-gray-700">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const students: MapPerson[] = [
  { id: "agira", name: "Agira", lat: AGIRA.lat, lng: AGIRA.lng, badge: "Riya · Arjun · Sara", detail: "Agira Hall · 3 seated", color: "#1d4ed8", dy: -18 },
  { id: "kabir", name: "Kabir", lat: PRITHVI.lat, lng: PRITHVI.lng, badge: "Kabir", detail: "Prithvi Hall · the 4th seat", color: "#1d4ed8", dy: 26, dx: -8 },
  { id: "library", name: "Library", lat: LIBRARY.lat, lng: LIBRARY.lng, badge: "Library", detail: "Closer drop · 0.69 km", color: "#166534", dy: -18 },
  { id: "audi", name: "Auditorium", lat: AUDI.lat, lng: AUDI.lng, badge: "Auditorium", detail: "Farther drop · 0.93 km", color: "#9a3412", dy: 24 },
];

const links: MapLink[] = [
  { id: "pick", from: [AGIRA.lat, AGIRA.lng], to: [PRITHVI.lat, PRITHVI.lng], color: "#166534", label: "Pick up Kabir · 0.32 km", strong: true },
  { id: "drop", from: [PRITHVI.lat, PRITHVI.lng], to: [LIBRARY.lat, LIBRARY.lng], color: "#166534", label: "Then the Library · 0.69 km", strong: true },
  { id: "skip", from: [PRITHVI.lat, PRITHVI.lng], to: [AUDI.lat, AUDI.lng], color: "#9a3412", label: "Auditorium is 0.93 km. Not this drop.", dash: "6 6" },
];

export function PoolReveal({ kabirWait, projectWait, projectLeft }: { kabirWait: string; projectWait: string; projectLeft: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6">
      <button className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide the map" : "Show this on the map"}
      </button>
      {open && (
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="relative">
            <FleetMap fitKey="pickup-four" drivers={[]} students={students} links={links} />
            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-2xl bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm">
              <span className="mr-3">Solid · the ride</span>
              <span>Dashed · the farther drop</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Fact title="The fourth seat" body="Kabir is 0.32 km away, about one minute. The auto goes to him. It does not sit at Agira hoping someone walks up." />
            <Fact title="Then the closer stop" body="With 4 aboard at Prithvi, the Library is 0.69 km and the Auditorium is 0.93 km. The Library is the drop. The ride is 3.4 min." />
            <Fact title="The old clock" body={`Kabir’s old auto is at ${kabirWait}, still waiting for people to sit. This ride ${projectLeft ? `left at ${projectWait}` : `is at ${projectWait}`}.`} />
          </div>
          <AlgoDrawer
            title="Why this route"
            rows={[
              { label: "What used to happen", value: "An auto stood at the hostel until four people had sat down. The student one hostel away was invisible. Both clocks just ran." },
              { label: "What this does", value: "The empty seat is filled by the nearest waiting student, Kabir at Prithvi. Cheapest insertion adds that stop because 0.32 km is inside the detour limit. The auto is then full." },
              { label: "Which drop", value: "From Prithvi the Library is 0.69 km and the Auditorium is 0.93 km. The shorter drop is the Library, so the route is Agira, Prithvi, Library." },
              { label: "The ride", value: "0.32 km to Kabir plus 0.69 km to the Library is 1.02 km. At 18 km/h that is 3.4 minutes, including the pickup." },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-[#f6f3ef] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
    </div>
  );
}
