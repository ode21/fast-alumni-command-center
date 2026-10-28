import { statuses } from "./domain.js";
export function seed() {
  const pics = [
    { id: "p1", name: "Arif Pratama", city: "Jakarta", target: 10 },
    { id: "p2", name: "Nadia Putri", city: "Bandung", target: 10 },
    { id: "p3", name: "Dimas Saputra", city: "Jakarta", target: 10 },
    { id: "p4", name: "Rani Wijaya", city: "Bandung", target: 10 },
  ];
  const names = [
    "Aditya Nugraha",
    "Bella Maharani",
    "Candra Kusuma",
    "Dewi Lestari",
    "Eka Ramadhan",
    "Farah Anindita",
    "Gilang Permana",
    "Hana Safitri",
    "Indra Wicaksono",
    "Jihan Aulia",
    "Kevin Prasetyo",
    "Laras Puspita",
    "Maya Anggraini",
    "Naufal Hakim",
    "Olivia Kirana",
    "Putra Mahendra",
    "Qori Amalia",
    "Rizky Firmansyah",
    "Salsa Nabila",
    "Tegar Hidayat",
    "Utami Kartika",
    "Vino Saputra",
    "Wulan Sari",
    "Yudha Pratama",
  ];
  const chairs = [
    { id: "c1", name: "Budi Santoso (contoh)", year: "2010" },
    { id: "c2", name: "Dian Permata (contoh)", year: "2011" },
  ];
  pics.forEach((p, i) => {
    p.chair = chairs[Math.floor(i / 2)].id;
    p.department = i % 2 ? "Teknik Informatika" : "Teknik Telekomunikasi";
  });
  const teams = Array.from({ length: 8 }, (_, i) => ({
    id: "t" + i,
    name:
      ["Bagas", "Citra", "Fajar", "Intan", "Reza", "Sinta", "Bayu", "Ayu"][i] +
      " (timses)",
    city: i % 2 ? "Bandung" : "Jakarta",
    pic: pics[i % 4].id,
  }));
  return {
    version: 3,
    chief: "Jendral Pemenangan",
    target: 100,
    chairs,
    pics,
    teams,
    orgs: [
      {
        id: "o1",
        name: "PT Jejaring Nusantara (contoh)",
        type: "Perusahaan",
        city: "Jakarta",
        contact: "Belum ditentukan",
      },
      {
        id: "o2",
        name: "PT Digital Parahyangan (contoh)",
        type: "Perusahaan",
        city: "Bandung",
        contact: "Belum ditentukan",
      },
      {
        id: "o3",
        name: "Alumni Jakarta (contoh)",
        type: "Komunitas",
        city: "Jakarta",
        contact: "Arif Pratama",
      },
      {
        id: "o4",
        name: "Alumni Bandung (contoh)",
        type: "Komunitas",
        city: "Bandung",
        contact: "Nadia Putri",
      },
    ],
    voters: names.map((name, i) => ({
      id: "v" + i,
      name,
      alumniId: "DEMO-" + String(i + 1).padStart(3, "0"),
      phone: "62800000" + String(i + 1).padStart(4, "0"),
      year: chairs[Math.floor((i % 4) / 2)].year,
      city: i % 2 ? "Bandung" : "Jakarta",
      company:
        i % 2
          ? "PT Digital Parahyangan (contoh)"
          : "PT Jejaring Nusantara (contoh)",
      community: i % 2 ? "Alumni Bandung (contoh)" : "Alumni Jakarta (contoh)",
      team: teams[i % 8].id,
      status: statuses[i < 3 ? 3 : i < 14 ? 2 : i < 20 ? 1 : 0],
      consent: i < 14,
      verifiedAt: i < 14 ? "2026-10-28" : "",
      inGroup: i % 3 !== 0,
      notes: "Data fiktif untuk demonstrasi.",
    })),
    logs: [
      {
        at: new Date().toISOString(),
        text: "Workspace demo dibuat dengan 24 alumni fiktif.",
      },
    ],
  };
}
