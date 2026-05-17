import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Leaf, Loader2, Download, Gift, Plus, X, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { apiFetch, getApiBase } from "@/lib/api";
import jsPDF from "jspdf";

interface Plant {
  id: number;
  name: string;
  emoji: string;
  price: number;
  category: string;
}

interface Donation {
  id: number;
  plantName: string;
  donorName: string;
  location: string;
  certificateId: string;
  amount: number;
  createdAt: string;
}

export default function Donations() {
  const { token, isAuthenticated, user } = useAuthStore();
  const [, navigate] = useLocation();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Donation | null>(null);
  const [form, setForm] = useState({ plantId: "", location: "", donorName: user?.name || "" });

  useEffect(() => {
    if (!isAuthenticated) { navigate("/auth"); return; }

    const fetchData = async () => {
      const [donRes, plantRes] = await Promise.all([
        apiFetch("/donations", {}, token!),
        fetch(`${getApiBase()}/api/plants`),
      ]);
      const donData = await donRes.json();
      const plantData = await plantRes.json();
      if (Array.isArray(donData)) setDonations(donData);
      if (Array.isArray(plantData)) setPlants(plantData);
      setLoading(false);
    };
    fetchData().catch(() => setLoading(false));
  }, [isAuthenticated, token, navigate, user]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/donations", {
        method: "POST",
        body: JSON.stringify({
          plantId: parseInt(form.plantId),
          location: form.location,
          donorName: form.donorName || user?.name,
        }),
      }, token);
      if (!res.ok) throw new Error();
      const donation = await res.json();
      setDonations(prev => [donation, ...prev]);
      setSuccess(donation);
      setShowForm(false);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCertificate = (donation: Donation) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = 297, h = 210;

    // Background gradient approximation
    doc.setFillColor(240, 253, 244);
    doc.rect(0, 0, w, h, "F");

    // Border
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(3);
    doc.rect(10, 10, w - 20, h - 20, "S");
    doc.setLineWidth(1);
    doc.rect(14, 14, w - 28, h - 28, "S");

    // Title
    doc.setFontSize(32);
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICATE OF PLANT DONATION", w / 2, 45, { align: "center" });

    // Subtitle
    doc.setFontSize(14);
    doc.setTextColor(74, 74, 74);
    doc.setFont("helvetica", "normal");
    doc.text("This certifies that a plant has been donated in your honor", w / 2, 60, { align: "center" });

    // Decorative line
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.5);
    doc.line(60, 68, w - 60, 68);

    // Main content
    doc.setFontSize(20);
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text(`${donation.donorName}`, w / 2, 82, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(74, 74, 74);
    doc.setFont("helvetica", "normal");
    doc.text("has donated a", w / 2, 92, { align: "center" });

    doc.setFontSize(22);
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text(donation.plantName, w / 2, 104, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(74, 74, 74);
    doc.setFont("helvetica", "normal");
    doc.text("to be planted in", w / 2, 114, { align: "center" });

    doc.setFontSize(18);
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text(donation.location, w / 2, 125, { align: "center" });

    // Line
    doc.line(60, 133, w - 60, 133);

    // Details
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const date = new Date(donation.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.text(`Date: ${date}`, w / 2, 143, { align: "center" });
    doc.text(`Certificate ID: ${donation.certificateId}`, w / 2, 152, { align: "center" });
    doc.text(`Amount: $${donation.amount.toFixed(2)}`, w / 2, 161, { align: "center" });

    // Footer
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.text("🌿 LEAFLINE — Premium Plant Store", w / 2, 185, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Growing a greener world, one plant at a time", w / 2, 193, { align: "center" });

    doc.save(`leafline-donation-${donation.certificateId}.pdf`);
  };

  const selectedPlant = plants.find(p => p.id === parseInt(form.plantId));

  return (
    <div className="min-h-screen pt-20 pb-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Heart className="w-7 h-7 text-green-600" />
              <h1 className="text-3xl font-bold text-foreground">Plant Donations</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />Donate a Plant
            </button>
          </div>

          {/* Success banner */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl flex items-start gap-3"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800 dark:text-green-300">Donation successful! 🌿</p>
                  <p className="text-sm text-green-700 dark:text-green-400">{success.plantName} has been donated. Certificate ID: <strong>{success.certificateId}</strong></p>
                </div>
                <button onClick={() => { downloadCertificate(success); setSuccess(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors">
                  <Download className="w-3.5 h-3.5" />Download Certificate
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Donate form modal */}
          <AnimatePresence>
            {showForm && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                  <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-semibold">Donate a Plant</h2>
                      </div>
                      <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><X className="w-4 h-4" /></button>
                    </div>

                    <form onSubmit={handleDonate} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Choose a Plant</label>
                        <select required value={form.plantId} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">Select a plant...</option>
                          {plants.map(p => (
                            <option key={p.id} value={p.id}>{p.emoji} {p.name} — ${p.price.toFixed(2)}</option>
                          ))}
                        </select>
                      </div>
                      {selectedPlant && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 flex items-center gap-3">
                          <span className="text-2xl">{selectedPlant.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-green-800 dark:text-green-300">{selectedPlant.name}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">Donation value: ${selectedPlant.price.toFixed(2)}</p>
                          </div>
                        </motion.div>
                      )}
                      <div>
                        <label className="text-sm font-medium mb-1 block">Donor Name</label>
                        <input required value={form.donorName} onChange={e => setForm(f => ({ ...f, donorName: e.target.value }))} placeholder="Your name" className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Donation Location</label>
                        <input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Central Park, New York" className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <p className="text-xs text-muted-foreground mt-1">Where would you like this plant to grow?</p>
                      </div>
                      <button type="submit" disabled={submitting} className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                        Complete Donation
                      </button>
                    </form>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Donations list */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
          ) : donations.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No donations yet</h2>
              <p className="text-muted-foreground mb-6">Make your first plant donation and receive a beautiful certificate!</p>
              <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-green-700 text-white rounded-full text-sm font-medium hover:bg-green-600 transition-colors">Donate Now</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {donations.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-background border border-border rounded-2xl p-5 hover:border-green-200 dark:hover:border-green-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <Leaf className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{d.plantName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">${d.amount.toFixed(2)}</span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mb-4">
                    <p>👤 <span className="font-medium text-foreground">{d.donorName}</span></p>
                    <p>📍 {d.location}</p>
                    <p>🏷 <span className="font-mono">{d.certificateId}</span></p>
                  </div>

                  <button
                    onClick={() => downloadCertificate(d)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 border border-green-600 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Certificate
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
