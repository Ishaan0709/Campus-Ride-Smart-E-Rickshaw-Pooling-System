import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import DemoRideMap from "@/components/DemoRideMap";
import FleetMap from "@/components/FleetMap";
import {
  publishDriverState,
  setRideStatus,
  watchDriverState,
  watchRides,
  type StoredRide,
} from "@/adapters/production/rides";
import { auth, getUserData, updateUserProfile } from "@/lib/firebase";
import { CAMPUS_PLACES, placeById } from "@/lib/campus";
import type { DriverRecord, DriverStatus } from "@/engine/types";
import {
  DEMO_DRIVER,
  DEMO_STUDENT,
  demoPublish,
  demoRole,
  demoSetStatus,
  leaveDemo,
  readDemo,
  subscribeDemo,
  type DemoDriver,
  type DemoRide,
} from "@/lib/demoAccounts";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("Driver");
  const [plate, setPlate] = useState("");
  const [placeId, setPlaceId] = useState(CAMPUS_PLACES[0].id);
  const [available, setAvailable] = useState(false);
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [rides, setRides] = useState<StoredRide[]>([]);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [demoDriver, setDemoDriver] = useState<DemoDriver>(() => readDemo().driver);
  const demo = demoRole() === "driver";

  useEffect(() => {
    if (demo) {
      setName(DEMO_DRIVER.name);
      setPlate(DEMO_DRIVER.plate);
      setPlaceId(DEMO_DRIVER.placeId);
      return subscribeDemo((state) => {
        setRides(state.rides);
        setDemoDriver(state.driver);
        setAvailable(state.driver.status !== "offline");
        setPlaceId(state.driver.placeId);
        setDriver({
          id: DEMO_DRIVER.id,
          name: DEMO_DRIVER.name,
          plate: DEMO_DRIVER.plate,
          location: { lat: state.driver.lat, lng: state.driver.lng },
          capacity: 4,
          passengerCount: state.driver.passengerCount,
          status: state.driver.status === "offline" ? "offline" : state.driver.status === "assigned" ? "assigned" : "available",
          completedRides: state.rides.filter((ride) => ride.status === "COMPLETED").length,
          route: [],
          version: 1,
        });
      });
    }
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/driver");
      return;
    }
    void getUserData(user.uid).then((profile) => {
      if (profile && profile.role !== "driver") {
        void signOut(auth);
        navigate("/auth/driver");
        return;
      }
      setName(profile?.name || "Driver");
      setPlate(profile?.vehicleNumber || profile?.plate || "");
    });
    const stopState = watchDriverState(user.uid, (next) => {
      setDriver(next);
      if (next) setAvailable(next.status !== "offline");
    });
    const stopRides = watchRides("driverId", user.uid, setRides);
    return () => {
      stopState();
      stopRides();
    };
  }, [navigate, demo]);

  const offer = rides.find((ride) => ride.status === "OFFERED");
  const active = rides.find((ride) => ["ACCEPTED", "OTP_VERIFIED", "IN_PROGRESS"].includes(ride.status));
  const place = placeById(placeId);

  useEffect(() => {
    if (demo || !offer?.offeredAt) return;
    const remaining = offer.offeredAt + 15000 - Date.now();
    const timer = window.setTimeout(() => {
      void setRideStatus(offer, "EXPIRED").catch(() => undefined);
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [offer, demo]);

  async function publish(status: DriverStatus) {
    if (demo) {
      demoPublish(placeId, status !== "offline");
      setAvailable(status !== "offline");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    setError("");
    try {
      await publishDriverState({
        uid: user.uid,
        id: user.uid,
        name,
        plate,
        location: { lat: place.lat, lng: place.lng },
        capacity: 4,
        passengerCount: driver?.passengerCount ?? 0,
        status,
        completedRides: driver?.completedRides ?? 0,
        route: driver?.route ?? [],
        version: driver?.version ?? 0,
      });
      await updateUserProfile(user.uid, { name, vehicleNumber: plate, status });
      setAvailable(status !== "offline");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish location");
    }
  }

  async function changeStatus(ride: StoredRide, status: "ACCEPTED" | "REJECTED" | "OTP_VERIFIED" | "IN_PROGRESS" | "COMPLETED") {
    if (demo) {
      demoSetStatus(ride as DemoRide, status);
      return;
    }
    await setRideStatus(ride, status);
  }

  async function verify() {
    if (!active || otp !== active.otp) {
      toast.error("OTP does not match");
      return;
    }
    await changeStatus(active, "OTP_VERIFIED");
    setOtp("");
  }

  const shownRide = (active ?? offer ?? rides.find((ride) => ride.status === "COMPLETED")) as DemoRide | undefined;

  return (
    <div className="min-h-screen bg-[#f6f4f2] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">{plate || "Vehicle not set"} · 4 seats</p>
            <h1 className="text-2xl font-semibold">{name}</h1>
          </div>
          <button className="rounded-full border px-4 py-2 text-sm" onClick={() => {
            if (demo) {
              leaveDemo();
              navigate("/");
              return;
            }
            void signOut(auth).then(() => navigate("/"));
          }}>Log out</button>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Availability</h2>
            <p className="mt-1 text-sm text-gray-500">Location is the campus point you publish. Live phone GPS is not connected.</p>
            <select className="mt-3 w-full rounded-lg border px-3 py-2" value={placeId} onChange={(event) => setPlaceId(event.target.value)}>
              {CAMPUS_PLACES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className="mt-3 w-full rounded-lg border px-3 py-2" value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="Vehicle number" />
            <div className="mt-3 flex gap-2">
              <button className={`rounded-lg px-4 py-2 ${available ? "bg-[#157a3a] text-white" : "border"}`} onClick={() => void publish("available")}>Available</button>
              <button className={`rounded-lg px-4 py-2 ${!available ? "bg-gray-800 text-white" : "border"}`} onClick={() => void publish("offline")}>Offline</button>
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {demo ? (
              <DemoRideMap ride={shownRide ?? null} parked={demoDriver} />
            ) : (
              <FleetMap
                drivers={[{ id: "me", name, lat: place.lat, lng: place.lng, status: available ? "available" : "offline", badge: name, detail: plate }]}
                students={(active ?? offer) ? [{ id: (active ?? offer)!.studentId, name: (active ?? offer)!.studentName, lat: (active ?? offer)!.pickup.lat, lng: (active ?? offer)!.pickup.lng, badge: (active ?? offer)!.studentName }] : []}
                rides={active ? [active] : offer ? [offer] : []}
              />
            )}
          </div>
        </section>
        <section className="space-y-4">
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Incoming offer</h2>
            {!offer && <p className="mt-2 text-sm text-gray-500">{demo ? `${DEMO_STUDENT.name} has not asked for a ride yet.` : "No offer is waiting. Offers expire after 15 seconds."}</p>}
            {offer && (
              <div className="mt-3 text-sm">
                <p className="font-medium">{offer.studentName}</p>
                <p className="mt-1">{offer.pickupLabel} to {offer.dropLabel}</p>
                <p className="mt-1 text-gray-600">{offer.reasons[0]}</p>
                <div className="mt-4 flex gap-2">
                  <button className="rounded-lg bg-[#7B0000] px-4 py-2 text-white" onClick={() => void changeStatus(offer, "ACCEPTED")}>Accept</button>
                  <button className="rounded-lg border px-4 py-2" onClick={() => void changeStatus(offer, "REJECTED")}>Reject</button>
                </div>
              </div>
            )}
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Active ride</h2>
            {!active && <p className="mt-2 text-sm text-gray-500">Accept an offer to start a trip.</p>}
            {active && (
              <div className="mt-3 text-sm">
                <p>{active.studentName} · {active.pickupLabel} to {active.dropLabel}</p>
                <p className="mt-1 text-gray-600">Status {active.status.replace(/_/g, " ")} · passengers {driver?.passengerCount ?? 0} / 4</p>
                {demo && active.status === "ACCEPTED" && <p className="mt-2 text-gray-700">{active.studentName.split(" ")[0]} is still outside. The OTP is how she gets in.</p>}
                {demo && ["OTP_VERIFIED", "IN_PROGRESS"].includes(active.status) && <p className="mt-2 text-gray-700">{active.studentName.split(" ")[0]} is seated with you. You leave together.</p>}
                {active.status === "ACCEPTED" && (
                  <div className="mt-3 flex gap-2">
                    <input className="rounded-lg border px-3 py-2" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="4-digit OTP" />
                    <button className="rounded-lg border px-3 py-2" onClick={() => void verify()}>Verify</button>
                  </div>
                )}
                {active.status === "OTP_VERIFIED" && (
                  <button className="mt-3 rounded-lg bg-[#7B0000] px-4 py-2 text-white" onClick={() => void changeStatus(active, "IN_PROGRESS")}>Start trip</button>
                )}
                {active.status === "IN_PROGRESS" && (
                  <button className="mt-3 rounded-lg bg-[#7B0000] px-4 py-2 text-white" onClick={() => void changeStatus(active, "COMPLETED")}>Complete trip</button>
                )}
              </div>
            )}
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">History</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {rides.filter((ride) => ride.status === "COMPLETED").length === 0 && <p>No completed rides yet.</p>}
              {rides.filter((ride) => ride.status === "COMPLETED").map((ride) => (
                <p key={ride.id}>{ride.pickupLabel} to {ride.dropLabel} · ₹{ride.fare}</p>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
