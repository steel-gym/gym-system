const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.send("Gym System API is running 💪");
});

// تسجيل دخول
app.post("/check-in", async (req, res) => {
  const { phone, type } = req.body;

  const table = type === "employee" ? "employees" : "members";

  const { data: person, error } = await supabase
    .from(table)
    .select("*")
    .eq("phone", phone)
    .single();

  if (error || !person) {
    return res.status(404).json({ message: "Person not found" });
  }

  // نتأكد إنه مش داخل بالفعل
  const { data: openLog } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("person_id", person.id)
    .eq("status", "open")
    .single();

  if (openLog) {
    return res.status(400).json({ message: "Already checked in" });
  }

  await supabase.from("attendance_logs").insert([
    {
      person_type: type,
      person_id: person.id,
      check_in_time: new Date(),
      status: "open",
    },
  ]);

  res.json({ message: "Check-in successful" });
});

// تسجيل خروج
app.post("/check-out", async (req, res) => {
  const { phone, type } = req.body;

  const table = type === "employee" ? "employees" : "members";

  const { data: person, error } = await supabase
    .from(table)
    .select("*")
    .eq("phone", phone)
    .single();

  if (error || !person) {
    return res.status(404).json({ message: "Person not found" });
  }

  const { data: openLog } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("person_id", person.id)
    .eq("status", "open")
    .single();

  if (!openLog) {
    return res.status(400).json({ message: "No active check-in found" });
  }

  await supabase
    .from("attendance_logs")
    .update({
      check_out_time: new Date(),
      status: "closed",
    })
    .eq("id", openLog.id);

  res.json({ message: "Check-out successful" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
