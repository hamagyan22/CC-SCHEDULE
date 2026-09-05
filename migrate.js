import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const supabaseUrl = 'https://veqvniwnrxhrvekbbkjb.supabase.co';
const supabaseKey = 'sb_publishable_WiL8kzQwkCCEQs-mG67O-A_3urPteVa';

const firebaseConfig = {
  apiKey: "AIzaSyA57FsZRIbPn6fzyNUp_PUiCPsAtqOUDKc",
  authDomain: "cc-schedule-b9681.firebaseapp.com",
  projectId: "cc-schedule-b9681",
  storageBucket: "cc-schedule-b9681.firebasestorage.app",
  messagingSenderId: "1015011308882",
  appId: "1:1015011308882:web:45aac6268ed67dc121368b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fetchSupabase(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.statusText}`);
  return await res.json();
}

async function clearCollection(colName) {
  const snapshot = await getDocs(collection(db, colName));
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, colName, document.id));
  }
}

async function migrate() {
  console.log("🚀 Starting migration...");
  
  try {
    console.log("Logging into Firebase as Admin...");
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.log("⚠️ Please run this script with ADMIN_PASSWORD=your_password node migrate.js");
      process.exit(1);
    }
    await signInWithEmailAndPassword(auth, 'mohammed.omer@fib.iq', password);
    console.log("✅ Logged in successfully!");
  } catch (e) {
    console.log("❌ Could not login to Firebase:", e.message);
    process.exit(1);
  }

  try {
    console.log("📦 Fetching Supabase data...");
    const teams = await fetchSupabase('teams');
    const shiftTypes = await fetchSupabase('shift_types');
    const employees = await fetchSupabase('employees');
    const schedules = await fetchSupabase('schedules');
    const notes = await fetchSupabase('schedule_notes');

    console.log(`Found ${teams.length} teams, ${employees.length} employees, ${schedules.length} schedules.`);

    console.log("🧹 Clearing any partially migrated data to avoid duplicates...");
    await clearCollection('teams');
    await clearCollection('shift_types');
    await clearCollection('employees');
    await clearCollection('schedules');
    await clearCollection('schedule_notes');

    // Mapping old IDs to new docs
    const teamMap = {}; 
    
    console.log("Migrating Teams...");
    for (const team of teams) {
      const docRef = await addDoc(collection(db, "teams"), { name: team.name });
      teamMap[team.id] = docRef.id;
    }

    console.log("Migrating Shift Types...");
    for (const shift of shiftTypes) {
      await addDoc(collection(db, "shift_types"), {
        code: shift.code || '',
        start_time: shift.start_time || null,
        end_time: shift.end_time || null
      });
    }

    const empMap = {}; 
    console.log("Migrating Employees...");
    for (const emp of employees) {
      const newTeamId = emp.team_id ? teamMap[emp.team_id] : null;
      const docRef = await addDoc(collection(db, "employees"), {
        name: emp.name || '',
        team_id: newTeamId || null
      });
      empMap[emp.id] = docRef.id;
    }

    console.log("Migrating Schedules...");
    for (const sched of schedules) {
      const newEmpId = empMap[sched.employee_id];
      if (!newEmpId) continue;
      const docId = `${newEmpId}_${sched.work_date}`;
      await setDoc(doc(db, "schedules", docId), {
        employee_id: newEmpId,
        shift_code: sched.shift_code || null,
        work_date: sched.work_date
      });
    }

    console.log("Migrating Notes...");
    for (const note of notes) {
      const newEmpId = empMap[note.employee_id];
      if (!newEmpId) continue;
      const docId = `${newEmpId}_${note.work_date}`;
      await setDoc(doc(db, "schedule_notes", docId), {
        employee_id: newEmpId,
        work_date: note.work_date,
        note: note.note || ''
      });
    }

    console.log("✅ Migration completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
