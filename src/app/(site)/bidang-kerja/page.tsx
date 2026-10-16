import type { Metadata } from "next";
import { InfoPage, Note, Section } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Bidang kerja Tokutei Ginou",
  description: "Daftar sektor kerja Tokutei Ginou (SSW) di Jepang beserta istilah Jepang dan contoh kosakata yang perlu disiapkan.",
};

const sectors = [
  { id: "Perawat lansia", jp: "介護", romaji: "kaigo", words: ["食事 shokuji: makan", "入浴 nyūyoku: mandi", "車いす kurumaisu: kursi roda"], note: "Perlu juga tes bahasa Jepang khusus kaigo." },
  { id: "Restoran dan makanan siap saji", jp: "外食業", romaji: "gaishokugyō", words: ["注文 chūmon: pesanan", "お会計 okaikei: bayar", "いらっしゃいませ: selamat datang"] },
  { id: "Industri makanan dan minuman", jp: "飲食料品製造業", romaji: "inshokuryōhin seizōgyō", words: ["衛生 eisei: kebersihan", "包装 hōsō: kemasan", "賞味期限 shōmi kigen: tanggal kedaluwarsa"] },
  { id: "Pertanian", jp: "農業", romaji: "nōgyō", words: ["畑 hatake: ladang", "収穫 shūkaku: panen", "肥料 hiryō: pupuk"] },
  { id: "Perikanan", jp: "漁業", romaji: "gyogyō", words: ["船 fune: kapal", "網 ami: jaring", "養殖 yōshoku: budidaya"] },
  { id: "Konstruksi", jp: "建設", romaji: "kensetsu", words: ["安全 anzen: keselamatan", "足場 ashiba: perancah", "ヘルメット: helm"] },
  { id: "Pembersihan gedung", jp: "ビルクリーニング", romaji: "biru kuriiningu", words: ["掃除 sōji: bersih-bersih", "床 yuka: lantai", "洗剤 senzai: deterjen"] },
  { id: "Manufaktur produk industri", jp: "工業製品製造業", romaji: "kōgyō seihin seizōgyō", words: ["機械 kikai: mesin", "部品 buhin: komponen", "検査 kensa: inspeksi"] },
  { id: "Perkapalan", jp: "造船・舶用工業", romaji: "zōsen hakuyō kōgyō", words: ["溶接 yōsetsu: las", "塗装 tosō: pengecatan", "図面 zumen: gambar teknik"] },
  { id: "Perawatan mobil", jp: "自動車整備", romaji: "jidōsha seibi", words: ["点検 tenken: pemeriksaan", "タイヤ: ban", "修理 shūri: perbaikan"] },
  { id: "Penerbangan", jp: "航空", romaji: "kōkū", words: ["空港 kūkō: bandara", "荷物 nimotsu: bagasi", "整備 seibi: perawatan"] },
  { id: "Perhotelan", jp: "宿泊", romaji: "shukuhaku", words: ["予約 yoyaku: reservasi", "フロント: resepsionis", "お客様 okyakusama: tamu"] },
  { id: "Angkutan mobil", jp: "自動車運送業", romaji: "jidōsha unsōgyō", words: ["運転 unten: menyetir", "配達 haitatsu: antar barang", "免許 menkyo: SIM"], note: "Perlu SIM Jepang." },
  { id: "Perkeretaapian", jp: "鉄道", romaji: "tetsudō", words: ["駅 eki: stasiun", "線路 senro: rel", "運行 unkō: operasional"] },
  { id: "Kehutanan", jp: "林業", romaji: "ringyō", words: ["木 ki: pohon", "伐採 bassai: penebangan", "山 yama: gunung"] },
  { id: "Industri kayu", jp: "木材産業", romaji: "mokuzai sangyō", words: ["木材 mokuzai: kayu olahan", "製材 seizai: penggergajian", "乾燥 kansō: pengeringan"] },
];

export default function SectorsPage() {
  return (
    <InfoPage
      path="/bidang-kerja"
      kicker="特定技能の分野"
      title="Bidang kerja Tokutei Ginou"
      intro={`Tokutei Ginou (SSW) membuka ${sectors.length} bidang kerja. Semua butuh bahasa Jepang minimal JFT-Basic A2 atau JLPT N4, ditambah ujian keterampilan sesuai bidangnya.`}
      image={{ src: "/images/program-jft.jpg", alt: "Ilustrasi pekerja muda di Jepang" }}
    >
      <Section title="Daftar bidang dan kosakata awalnya" subtitle="Di kelas, kosakata kerja seperti ini dilatih lewat percakapan supaya siap saat wawancara.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => (
            <div key={s.romaji} className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="font-jp text-xl text-red-700">{s.jp}</p>
              <p className="text-xs text-stone-500">{s.romaji}</p>
              <h3 className="mt-1 font-semibold text-stone-900">{s.id}</h3>
              <ul className="mt-3 space-y-1 text-sm text-stone-700">
                {s.words.map((w) => (
                  <li key={w} className="font-jp">{w}</li>
                ))}
              </ul>
              {s.note && <p className="mt-3 text-xs text-amber-800">{s.note}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Note>Daftar bidang dan syarat ujian bisa berubah mengikuti kebijakan pemerintah Jepang. Cek informasi terbaru sebelum mendaftar ke lembaga penempatan.</Note>
    </InfoPage>
  );
}
