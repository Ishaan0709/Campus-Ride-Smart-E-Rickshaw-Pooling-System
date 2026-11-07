import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import FleetMap from "@/components/FleetMap";
import { bookProductionRide, setRideStatus, watchRides, type StoredRide } from "@/adapters/production/rides";
import { auth, getUserData, updateUserProfile } from "@/lib/firebase";
import { CAMPUS_PLACES } from "@/lib/campus";

const STEPS = ["REQUESTED", "OFFERED", "ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS", "COMPLETED"];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [hostel, setHostel] = useState("");
  const [email, setEmail] = useState("");
  const [pickup, setPickup] = useState(CAMPUS_PLACES[0].id);
  const [drop, setDrop] = useState(CAMPUS_PLACES[3].id);
  const [pooled, setPooled] = useState(true);
  const [rides, setRides] = useState<StoredRide[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/student");
      return;
    }
    void getUserData(user.uid).then((profile) => {
      if (profile && profile.role !== "student") {
        void signOut(auth);
        navigate("/auth/student");
        return;
      }
      setName(profile?.name || "");
      setRoll(profile?.roll || "");
      setHostel(profile?.hostel || "");
      setEmail(profile?.email || user.email || "");
    });
    return watchRides("studentId", user.uid, setRides);
  }, [navigate]);

  const active = rides.find((ride) => !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(ride.status));
  const pickupPlace = CAMPUS_PLACES.find((place) => place.id === pickup) ?? CAMPUS_PLACES[0];
  const dropPlace = CAMPUS_PLACES.find((place) => place.id === drop) ?? CAMPUS_PLACES[3];

  async function book(event: FormEvent) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    if (pickup === drop) {
      toast.error("Choose two different places");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await bookProductionRide({
        studentId: user.uid,
        studentName: name || "Student",
        pickup: { ...pickupPlace, label: pickupPlace.name },
        drop: { ...dropPlace, label: dropPlace.name },
        pooled,
        idempotencyKey: `${user.uid}-${pickup}-${drop}-${Date.now()}`,
      });
      if (result.saved === false) {
        setNotice(result.message);
        return;
      }
      setNotice(result.ride.reasons[0] || "Request recorded");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Booking could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;
    await updateUserProfile(user.uid, { name, roll, hostel });
    setEditing(false);
    toast.success("Profile saved");
  }

  return (
    <div className="min-h-screen bg-[#f6f4f2] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">Campus Ride</p>
            <h1 className="text-2xl font-semibold">Good day, {name || "student"}</h1>
          </div>
          <button className="rounded-full border px-4 py-2 text-sm" onClick={() => void signOut(auth).then(() => navigate("/"))}>Log out</button>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <form onSubmit={book} className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Book a ride</h2>
            <p className="mt-1 text-sm text-gray-500">Pickup is a campus point you choose. Phone GPS is not connected.</p>
            <label className="mt-4 block text-sm">Pickup
              <select className="mt-1 w-full rounded-lg border px-3 py-2" value={pickup} onChange={(event) => setPickup(event.target.value)}>
                {CAMPUS_PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm">Destination
              <select className="mt-1 w-full rounded-lg border px-3 py-2" value={drop} onChange={(event) => setDrop(event.target.value)}>
                {CAMPUS_PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <button type="button" onClick={() => setPooled(true)} className={`rounded-lg border px-3 py-3 ${pooled ? "border-[#7B0000]" : ""}`}>Pool · ₹10</button>
              <button type="button" onClick={() => setPooled(false)} className={`rounded-lg border px-3 py-3 ${!pooled ? "border-[#7B0000]" : ""}`}>Solo · ₹40</button>
            </div>
            <button disabled={busy || Boolean(active)} className="mt-4 w-full rounded-lg bg-[#7B0000] py-3 text-white disabled:opacity-50">
              {busy ? "Matching" : "Book ride"}
            </button>
            {notice && <p className="mt-3 text-sm text-gray-600">{notice}</p>}
          </form>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Profile</h2>
              <button className="text-sm text-[#7B0000]" onClick={() => editing ? void saveProfile() : setEditing(true)}>{editing ? "Save" : "Edit"}</button>
            </div>
            {editing ? (
              <div className="mt-3 space-y-2">
                <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
                <input className="w-full rounded-lg border px-3 py-2" value={roll} onChange={(event) => setRoll(event.target.value)} />
                <input className="w-full rounded-lg border px-3 py-2" value={hostel} onChange={(event) => setHostel(event.target.value)} placeholder="Hostel" />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">{roll || "Roll not set"} · {email}{hostel ? ` · ${hostel}` : ""}</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <FleetMap
              drivers={active?.driverId ? [{ id: active.driverId, name: "Assigned auto", lat: active.pickup.lat, lng: active.pickup.lng, status: "assigned" }] : []}
              students={[{ id: "me", name: "Pickup", lat: pickupPlace.lat, lng: pickupPlace.lng }]}
              rides={active ? [active] : []}
            />
          </div>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Current ride</h2>
            {!active && <p className="mt-2 text-sm text-gray-500">No active booking.</p>}
            {active && (
              <div className="mt-3 text-sm">
                <p>{active.pickupLabel} to {active.dropLabel}</p>
                <p className="mt-1 text-gray-600">Fare ₹{active.fare} · {active.driverId ? `Driver ${active.driverId.slice(-6)}` : "Waiting for a driver"}</p>
                {active.etaMin !== undefined && <p className="mt-1 text-gray-600">Estimated pickup {active.etaMin.toFixed(1)} min</p>}
                {active.otp && <p className="mt-2 font-medium">OTP {active.otp}</p>}
                <ol className="mt-4 space-y-1">
                  {STEPS.map((step) => (
                    <li key={step} className={step === active.status ? "font-semibold text-[#7B0000]" : "text-gray-500"}>{step.replace(/_/g, " ")}</li>
                  ))}
                </ol>
                {active.reasons[0] && <p className="mt-3 text-gray-600">{active.reasons[0]}</p>}
                {active.status === "PENDING_REASSIGNMENT" && (
                  <button className="mt-4 rounded-lg border px-3 py-2" onClick={() => void setRideStatus(active, "CANCELLED")}>Clear and book again</button>
                )}
                {["REQUESTED", "OFFERED", "ACCEPTED"].includes(active.status) && (
                  <button className="mt-4 rounded-lg border px-3 py-2" onClick={() => void setRideStatus(active, "CANCELLED")}>Cancel ride</button>
                )}
              </div>
            )}
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Previous rides</h2>
            <div className="mt-3 space-y-2 text-sm">
              {rides.filter((ride) => ride !== active).length === 0 && <p className="text-gray-500">Completed rides will appear here.</p>}
              {rides.filter((ride) => ride !== active).map((ride) => (
                <p key={ride.id}>{ride.pickupLabel} to {ride.dropLabel} · {ride.status} · ₹{ride.fare}</p>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
