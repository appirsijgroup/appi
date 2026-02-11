import { PrayerGuide, DailyPrayer, Achievement } from '@/types';

/**
 * KOMPONEN BACAAN SHOLAT - SESUAI HPT MUHAMMADIYAH
 */

const TAKBIRATUL_IHRAM = {
    title: "Takbiratul Ihram",
    arabic: "اللهُ أَكْبَرُ",
    latin: "Allahu Akbar",
    translation: "Allah Maha Besar",
    description: "Mengangkat kedua tangan sejajar telinga atau bahu seraya mengucapkan Takbir. Niat sholat dilakukan di dalam hati pada saat ini."
};

const DOA_IFTITAH = {
    title: "Doa Iftitah",
    arabic: "اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ، اللَّهُمَّ نَقِّنِي مِنْ خَطَايَايَ كَمَا يُنَقَّى الثَّوْبُ الْأَبْيَضُ مِنَ الدَّنَسِ، اللَّهُمَّ اغْسِلْنِي مِنْ خَطَايَايَ بِالثَّلْجِ وَالْمَاءِ وَالْبَرَدِ",
    latin: "Allahumma baa'id bainii wa baina khathaayaaya kamaa baa'adta bainal masyriqi wal maghrib. Allahumma naqqinii min khathaayaaya kamaa yunaqqats tsaubul abyadhu minad danas. Allahummaghsilnii min khathaayaaya bits tsalji wal maa-i wal barad.",
    translation: "Ya Allah, jauhkanlah antara aku dan kesalahanku sebagaimana Engkau menjauhkan antara timur dan barat. Ya Allah, bersihkanlah aku dari kesalahanku sebagaimana pakaian putih dibersihkan dari kotoran. Ya Allah, cucilah kesalahanku dengan salju, air, dan air es.",
    description: "Dibaca setelah Takbiratul Ihram pada rakaat pertama saja."
};

const AL_FATIHAH = {
    title: "Membaca Al-Fatihah",
    arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ. اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ. الرَّحْمٰنِ الرَّحِيْمِۙ. مٰلِكِ يَوْمِ الدِّيْنِۗ. اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِيْنُۗ. اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيْمَۙ. صِرَاطَ الَّذِيْنَ اَنْعَمْتَ عَلَيْهِمْ ەۙ غَيْرِ الْمَغْضُوْبِ عَلَيْهِمْ وَلَا الضَّاۤلِّيْنَࣖ.",
    latin: "Bismillaahir-rahmaanir-rahiim. Al-hamdu lillaahi rabbil-'aalamiin. Ar-rahmaanir-rehiim. Maaliki yaumid-diin. Iyyaaka na'budu wa iyyaaka nasta'iin. Ihdinash-shiraathal-mustaqiim. Shiraathal-ladziina an'amta 'alaihim ghairil-maghdhuubi 'alaihim wa ladh-dhaalliin.",
    translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang. Segala puji bagi Allah, Tuhan seluruh alam. Yang Maha Pengasih, Maha Penyayang. Pemilik hari pembalasan. Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan. Tunjukilah kami jalan yang lurus. (yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat.",
    description: "Wajib dibaca pada setiap rakaat."
};

const SURAT_PENDEK = {
    title: "Membaca Surat Al-Quran",
    arabic: "",
    latin: "(Membaca surat pilihan)",
    translation: "",
    description: "Setelah Al-Fatihah, bacalah surat atau ayat-ayat Al-Quran pada rakaat pertama dan kedua."
};

const RUKU = {
    title: "Rukuk",
    arabic: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ اللَّهُمَّ اغْفِرْ لِي",
    latin: "Subhaanakallahumma rabbanaa wa bihamdika, allahummaghfir-lii.",
    translation: "Maha Suci Engkau ya Allah, Tuhan kami, dan dengan memuji-Mu, ya Allah, ampunilah aku.",
    description: "Membungkukkan badan dengan meletakkan tangan di lutut."
};

const ITIDAL = {
    title: "I'tidal",
    arabic: "سَمِعَ اللهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ",
    latin: "Sami'allaahu liman hamidah. Rabbanaa wa lakal-hamd.",
    translation: "Allah mendengar orang yang memuji-Nya. Ya Tuhan kami, bagi-Mu segala puji.",
    description: "Bangun dari rukuk dan berdiri tegak."
};

const SUJUD = {
    title: "Sujud",
    arabic: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ اللَّهُمَّ اغْفِرْ لِي",
    latin: "Subhaanakallahumma rabbanaa wa bihamdika, allahummaghfir-lii.",
    translation: "Maha Suci Engkau ya Allah, Tuhan kami, dan dengan memuji-Mu, ya Allah, ampunilah aku.",
    description: "Meletakkan dahi, hidung, kedua telapak tangan, lutut, dan jari kaki di lantai."
};

const DUDUK_ANTARA_DUA_SUJUD = {
    title: "Duduk di Antara Dua Sujud",
    arabic: "اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَاهْدِنِي وَارْزُقْنِي",
    latin: "Allaahummaghfir-lii warham-nii wajbur-nii wahdi-nii warzuq-nii.",
    translation: "Ya Allah, ampunilah aku, sayangilah aku, cukupilah aku, berilah aku petunjuk, dan berilah aku rezeki.",
    description: "Duduk tegak berpijak pada kaki kiri dan menegakkan kaki kanan (Iftirasy)."
};

const TASYAHUD_AWAL = {
    title: "Tasyahud Awal",
    arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh.",
    translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.",
    description: "Dilakukan pada rakaat kedua pada sholat yang memiliki lebih dari dua rakaat."
};

const TASYAHUD_AKHIR = {
    title: "Tasyahud Akhir",
    arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ. اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، فِي الْعَالَمِينَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
    latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh. Allaahumma shalli 'alaa muhammadin wa 'alaa aali muhammad, kamaa shallaita 'alaa ibraahiima wa 'alaa aali ibraahiim. Wa baarik 'alaa muhammadin wa 'alaa aali muhammad, kamaa baarakta 'alaa ibraahiima wa 'alaa aali ibraahiim. Fil 'aalamiina innaka hamiidum majiid.",
    translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah... (dan shalawat sebagaimana Ibrahim). Sesungguhnya Engkau Maha Terpuji lagi Maha Mulia.",
    description: "Membaca tasyahud lengkap dengan shalawat Nabi sebelum salam."
};

const DOA_PERLINDUNGAN = {
    title: "Doa Sebelum Salam",
    arabic: "اللَّهُمَّ إِنِّي أَعُوْذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ، وَمِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيْحِ الدَّجَّالِ",
    latin: "Allahumma inni a'uudzu bika min 'adzaabi jahannam, wa min 'adzaabil qabri, wa min fitnatil mahyaa wal mamaat, wa min syarri fitnatil masiihid dajjaal.",
    translation: "Ya Allah, aku berlindung kepada-Mu dari siksa neraka Jahannam, dari siksa kubur, dari fitnah kehidupan dan kematian, dan dari buruknya fitnah Al-Masih Ad-Dajjal.",
    description: "Dianjurkan dibaca setelah tasyahud akhir sebelum salam."
};

const SALAM = {
    title: "Salam",
    arabic: "السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ",
    latin: "Assalaamu 'alaikum wa rahmatullaah.",
    translation: "Keselamatan dan rahmat Allah semoga tercurah kepadamu.",
    description: "Menoleh ke kanan, kemudian menoleh ke kiri."
};

const SALAM_JENAZAH = {
    title: "Salam",
    arabic: "اَلسَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ",
    latin: "Assalaamu 'alaikum wa rahmatullaahi wa barakaatuh.",
    translation: "Keselamatan, rahmat Allah, dan keberkahan-Nya semoga tercurah kepadamu.",
    description: "Menoleh ke kanan, kemudian menoleh ke kiri."
};

/**
 * LOGIKA RUNUTAN PER RAKAAT
 */

const GENERATE_RAKAAT = (num: number, hasSurah: boolean = true): any[] => [
    { ...AL_FATIHAH, id: `r${num}-fatihah`, title: `[Rakaat ${num}] Al-Fatihah` },
    hasSurah ? { ...SURAT_PENDEK, id: `r${num}-surah`, title: `[Rakaat ${num}] Membaca Surat` } : null,
    { ...RUKU, id: `r${num}-ruku` },
    { ...ITIDAL, id: `r${num}-itidal` },
    { ...SUJUD, id: `r${num}-sujud1` },
    { ...DUDUK_ANTARA_DUA_SUJUD, id: `r${num}-duduk` },
    { ...SUJUD, id: `r${num}-sujud2` },
].filter(Boolean);

export const PRAYER_GUIDES: PrayerGuide[] = [
    {
        id: 'subuh',
        title: "Sholat Subuh",
        description: "Panduan sholat fardhu Subuh (2 rakaat) sesuai Tarjih Muhammadiyah. Tanpa doa Qunut.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak menghadap kiblat. Niatkan sholat Subuh di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'dzuhur',
        title: "Sholat Dzuhur",
        description: "Panduan sholat fardhu Dzuhur (4 rakaat) sesuai Tarjih Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak menghadap kiblat. Niatkan sholat Dzuhur di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AWAL, id: 'tasyahud-awal' },
            ...GENERATE_RAKAAT(3, false), // Rakaat 3 & 4 biasanya tidak perlu surat pendek
            ...GENERATE_RAKAAT(4, false),
            { ...TASYAHUD_AKHIR, id: 'tasyahud-akhir' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'ashar',
        title: "Sholat Ashar",
        description: "Panduan sholat fardhu Ashar (4 rakaat) sesuai Tarjih Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak menghadap kiblat. Niatkan sholat Ashar di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AWAL, id: 'tasyahud-awal' },
            ...GENERATE_RAKAAT(3, false),
            ...GENERATE_RAKAAT(4, false),
            { ...TASYAHUD_AKHIR, id: 'tasyahud-akhir' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'maghrib',
        title: "Sholat Maghrib",
        description: "Panduan sholat fardhu Maghrib (3 rakaat) sesuai Tarjih Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak menghadap kiblat. Niatkan sholat Maghrib di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AWAL, id: 'tasyahud-awal' },
            ...GENERATE_RAKAAT(3, false),
            { ...TASYAHUD_AKHIR, id: 'tasyahud-akhir' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'isya',
        title: "Sholat Isya",
        description: "Panduan sholat fardhu Isya (4 rakaat) sesuai Tarjih Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak menghadap kiblat. Niatkan sholat Isya di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AWAL, id: 'tasyahud-awal' },
            ...GENERATE_RAKAAT(3, false),
            ...GENERATE_RAKAAT(4, false),
            { ...TASYAHUD_AKHIR, id: 'tasyahud-akhir' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'jenazah-laki',
        title: "Sholat Jenazah (Laki-laki)",
        description: "Panduan sholat untuk jenazah laki-laki (4 takbir tanpa rukuk dan sujud) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: "", latin: "", translation: "", description: "Niat di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir1', title: "Takbir Pertama (Membaca Al-Fatihah)", description: "Setelah takbir pertama, dilanjutkan dengan membaca ta’awudz, lalu membaca surat al-Fatihah." },
            { ...AL_FATIHAH, id: 'fatihah' },
            { id: 'takbir2', title: "Takbir Kedua (Membaca Shalawat)", arabic: "اَللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى الِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ وَبَارِكْ عَلَى مُحَمَّدٍ وَالِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ. إِنَّكَ حَمِيْدٌ مَجِيْدٌ", latin: "Allahumma shalli 'ala muhammadin wa 'ala aali muhammad kama shallaita 'ala ibrahima wa aali ibrahim, wa baarik 'ala muhammadin wa 'ala aali muhammad kama baarakta 'ala ibrahima wa aali ibrahim. Innaka hamidum majiid.", translation: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad...", description: "Setelah takbir kedua, dilanjutkan dengan membaca shalawat." },
            { id: 'takbir3', title: "Takbir Ketiga (Doa untuk Jenazah)", arabic: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَاعْفُ عَنْهُ وَعَافِهِ وَأَكْرِمْ nُزُلَهُ وَوَسِّعْ مُدْخَلَهُ وَاغْسِلْهُ بِمَاءٍ وَثَلْجٍ وَبَرَدٍ وَنَقِّهِ مِنَ الْخَطَايَا كَمَا يُنَقَّى الثَّوْبُ الأَبْيَضُ مِنَ الدَّنَسِ وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ وَأَهْلاً خَيْرًا مِنْ أَهْلِهِ وَزَوْجًا خَيْرًا مِنْ زَوْجِهِ وَقِهِ فِتْنَةَ الْقَبْرِ وَعَذَابَ النَّارِ", latin: "Allahummaghfir-lahu warhamhu wa'fu 'anhu wa 'aafihi wa akrim nuzulahu wa wassi' mudkhalahu waghsilhu bimaa-in wa tsaljin wa baradin wa naqqihi minal khathaayaa kamaa yunaqqats tsaubul abyadhu minad danas wa abdilhu daaran khairan min daarihi wa ahlan khairan min ahlihi wa zaujan khairan min zaujihi wa qihi fitnatal qabri wa 'adzaban naar.", translation: "Ya Allah, ampunilah dia, rahmatilah dia, maafkanlah dia, sejahterakanlah dia, muliakanlah tempatnya, luaskanlah tempat masuknya, cucilah dia dengan air, salju dan air es...", description: "Setelah takbir ketiga, dilanjutkan dengan membaca doa untuk jenazah." },
            { id: 'takbir4', title: "Takbir Keempat (Doa untuk Keluarga & Kaum Muslimin)", arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا ، وَشَاهِدِنَا وَغَائِبِنَا ، وَصَغِيرِنَا وَكَبِيرِنَا ، وَذَكَرِنَا وَأُنْثَانَا ، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِسْلاَمِ ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهُ ، وَلاَ تُضِلَّنَا بَعْدَهُ", latin: "Allahummaghfir lihayyinaa wa mayyitinaa wa syaahidinaa wa ghaa-ibinaa wa shaghiirinaa wa kabiirinaa wa dzakarinaa wa untsaanaa. Allahumma man ahyaitahu minnaa fa-ahyihi 'alal islaam, wa man tawaffaitahu minnaa fatawaffahu 'alal iimaan. Allahumma laa tahrimnaa ajrahu wa laa tudhillanaa ba'dahu.", translation: "Ya Allah, ampunilah yang hidup di antara kami dan yang mati, yang hadir dan yang ghaib, yang kecil dan yang besar, laki-laki dan perempuan...", description: "Setelah takbir keempat, dilanjutkan dengan membaca doa penutup." },
            { ...SALAM_JENAZAH, id: 'salam' }
        ]
    },
    {
        id: 'jenazah-perempuan',
        title: "Sholat Jenazah (Perempuan)",
        description: "Panduan sholat untuk jenazah perempuan (4 takbir tanpa rukuk dan sujud) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: "", latin: "", translation: "", description: "Niat di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir1', title: "Takbir Pertama (Membaca Al-Fatihah)", description: "Setelah takbir pertama, dilanjutkan dengan membaca ta’awudz, lalu membaca surat al-Fatihah." },
            { ...AL_FATIHAH, id: 'fatihah' },
            { id: 'takbir2', title: "Takbir Kedua (Membaca Shalawat)", arabic: "اَللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى الِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ وَبَارِكْ عَلَى مُحَمَّدٍ وَالِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ. إِنَّكَ حَمِيْدٌ مَجِيْدٌ", latin: "Allahumma shalli 'ala muhammadin wa 'ala aali muhammad kama shallaita 'ala ibrahima wa aali ibrahim, wa baarik 'ala muhammadin wa 'ala aali muhammad kama baarakta 'ala ibrahima wa aali ibrahim. Innaka hamidum majiid.", translation: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad...", description: "Setelah takbir kedua, dilanjutkan dengan membaca shalawat." },
            { id: 'takbir3', title: "Takbir Ketiga (Doa untuk Jenazah)", arabic: "اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَاعْفُ عَنْهَا وَعَافِهَا وَأَكْرِمْ نُزُلَهَا وَوَسِّعْ مُدْخَلَهَا وَاغْسِلْهَا بِمَاءٍ وَثَلْجٍ وَبَرَدٍ وَنَقِّهَا مِنَ الْخَطَايَا كَمَا يُنَقَّى الثَّوْبُ الأَبْيَضُ مِنَ الدَّنَسِ وَأَبْدِلْهَا دَارًا خَيْرًا مِنْ دَارِهَا وَأَهْلاً خَيْرًا مِنْ أَهْلِهَا وَزَوْجًا خَيْرًا مِنْ زَوْجِهَا وَقِهَا فِتْنَةَ الْقَبْرِ وَعَذَابَ النَّارِ", latin: "Allahummaghfir-lahaa warhamhaa wa'fu 'anhaa wa 'aafihaa wa akrim nuzulahaa wa wassi' mudkhalahaa waghsilhaa bimaa-in wa tsaljin wa baradin wa naqqihaa minal khathaayaa kamaa yunaqqats tsaubul abyadhu minad danas wa abdilhaa daaran khairan min daarihaa wa ahlan khairan min ahlihaa wa zaujan khairan min zaujihaa wa qihaa fitnatal qabri wa 'adzaban naar.", translation: "Ya Allah, ampunilah dia, rahmatilah dia, maafkanlah dia, sejahterakanlah dia, muliakanlah tempatnya, luaskanlah tempat masuknya, cucilah dia dengan air, salju dan air es...", description: "Setelah takbir ketiga, ditujukan untuk jenazah perempuan." },
            { id: 'takbir4', title: "Takbir Keempat (Doa untuk Keluarga & Kaum Muslimin)", arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا ، وَشَاهِدِنَا وَغَائِبِنَا ، وَصَغِيرِنَا وَكَبِيرِنَا ، وَذَكَرِنَا وَأُنْثَانَا ، اللَّهُمَّ mَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِسْلاَمِ ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهَا ، وَلاَ تُضِلَّنَا بَعْدَهَا", latin: "Allahummaghfir lihayyinaa wa mayyitinaa wa syaahidinaa wa ghaa-ibinaa wa shaghiirinaa wa kabiirinaa wa dzakarinaa wa untsaanaa. Allahumma man ahyaitahu minnaa fa-ahyihi 'alal islaam, wa man tawaffaitahu minnaa fatawaffahu 'alal iimaan. Allahumma laa tahrimnaa ajrahaa wa laa tudhillanaa ba'dahaa.", translation: "Ya Allah, ampunilah yang hidup di antara kami dan yang mati, yang hadir dan yang ghaib, yang kecil dan yang besar, laki-laki dan perempuan...", description: "Setelah takbir keempat, dilanjutkan dengan membaca doa penutup." },
            { ...SALAM_JENAZAH, id: 'salam' }
        ]
    },
    {
        id: 'jenazah-anak-laki',
        title: "Sholat Jenazah (Anak Laki-laki)",
        description: "Panduan sholat untuk jenazah anak laki-laki dengan doa khusus untuk orang tua sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: "", latin: "", translation: "", description: "Niat di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir1', title: "Takbir Pertama (Membaca Al-Fatihah)", description: "Setelah takbir pertama, dilanjutkan dengan membaca ta’awudz, lalu membaca surat al-Fatihah." },
            { ...AL_FATIHAH, id: 'fatihah' },
            { id: 'takbir2', title: "Takbir Kedua (Membaca Shalawat)", arabic: "اَللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى الِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ وَبَارِكْ عَلَى مُحَمَّدٍ وَالِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ. إِنَّكَ حَمِيْدٌ مَجِيْدٌ", latin: "Allahumma shalli 'ala muhammadin wa 'ala aali muhammad kama shallaita 'ala ibrahima wa aali ibrahim, wa baarik 'ala muhammadin wa 'ala aali muhammad kama baarakta 'ala ibrahima wa aali ibrahim. Innaka hamidum majiid.", translation: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad...", description: "Setelah takbir kedua, dilanjutkan dengan membaca shalawat." },
            { id: 'takbir3', title: "Takbir Ketiga (Doa untuk Anak)", arabic: "اللَّهُمَّ اجْعَلْهُ لَنَا سَلَفًا وَفَرَطًا وَأَجْرًا", latin: "Allahummaj’alhu lanaa salafan wa farathan wa ajran.", translation: "Ya Allah, jadikanlah ia sebagai tabungan pendahulu, titipan, dan pahala bagi kami (kedua orang tuanya).", description: "Doa khusus untuk jenazah anak agar menjadi simpanan pahala bagi orang tua." },
            { id: 'takbir4', title: "Takbir Keempat (Doa untuk Keluarga & Kaum Muslimin)", arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا ، وَشَاهِدِنَا وَغَائِبِنَا ، وَصَغِيرِنَا وَكَبِيرِنَا ، وَذَكَرِنَا وَأُنْثَانَا ، اللَّهُمَّ mَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِسْلاَمِ ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِيمَانِ ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهُ ، وَلاَ تُضِلَّنَا بَعْدَهُ", latin: "Allahummaghfir lihayyinaa wa mayyitinaa wa syaahidinaa wa ghaa-ibinaa wa shaghiirinaa wa kabiirinaa wa dzakarinaa wa untsaanaa. Allahumma man ahyaitahu minnaa fa-ahyihi 'alal islaam, wa man tawaffaitahu minnaa fatawaffahu 'alal iimaan. Allahumma laa tahrimnaa ajrahu wa laa tudhillanaa ba'dahu.", translation: "Ya Allah, ampunilah yang hidup di antara kami dan yang mati...", description: "Setelah takbir keempat, dilanjutkan dengan membaca doa penutup." },
            { ...SALAM_JENAZAH, id: 'salam' }
        ]
    },
    {
        id: 'jenazah-anak-perempuan',
        title: "Sholat Jenazah (Anak Perempuan)",
        description: "Panduan sholat untuk jenazah anak perempuan dengan doa khusus untuk orang tua sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: "", latin: "", translation: "", description: "Niat di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir1', title: "Takbir Pertama (Membaca Al-Fatihah)", description: "Setelah takbir pertama, dilanjutkan dengan membaca ta’awudz, lalu membaca surat al-Fatihah." },
            { ...AL_FATIHAH, id: 'fatihah' },
            { id: 'takbir2', title: "Takbir Kedua (Membaca Shalawat)", arabic: "اَللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى الِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ وَبَارِكْ عَلَى مُحَمَّدٍ وَالِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيْمَ وَالِ إِبْرَاهِيْمَ. إِنَّكَ حَمِيْدٌ مَجِيْدٌ", latin: "Allahumma shalli 'ala muhammadin wa 'ala aali muhammad kama shallaita 'ala ibrahima wa aali ibrahim, wa baarik 'ala muhammadin wa 'ala aali muhammad kama baarakta 'ala ibrahima wa aali ibrahim. Innaka hamidum majiid.", translation: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad...", description: "Setelah takbir kedua, dilanjutkan dengan membaca shalawat." },
            { id: 'takbir3', title: "Takbir Ketiga (Doa untuk Anak)", arabic: "اللَّهُمَّ اجْعَلْهَا لَنَا سَلَفًا وَفَرَطًا وَأَجْرًا", latin: "Allahummaj’alhaa lanaa salafan wa farathan wa ajran.", translation: "Ya Allah, jadikanlah ia sebagai tabungan pendahulu, titipan, dan pahala bagi kami (kedua orang tuanya).", description: "Doa khusus untuk jenazah anak agar menjadi simpanan pahala bagi orang tua." },
            { id: 'takbir4', title: "Takbir Keempat (Doa untuk Keluarga & Kaum Muslimin)", arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا ، وَشَاهِدِنَا وَغَائِبِنَا ، وَصَغِيرِنَا وَكَبِيرِنَا ، وَذَكَرِنَا وَأُنْثَانَا ، اللَّهُمَّ mَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِسْلاَمِ ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ ، اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهَا ، وَلاَ تُضِلَّنَا بَعْدَهَا", latin: "Allahummaghfir lihayyinaa wa mayyitinaa wa syaahidinaa wa ghaa-ibinaa wa shaghiirinaa wa kabiirinaa wa dzakarinaa wa untsaanaa. Allahumma man ahyaitahu minnaa fa-ahyihi 'alal islaam, wa man tawaffaitahu minnaa fatawaffahu 'alal iimaan. Allahumma laa tahrimnaa ajrahaa wa laa tudhillanaa ba'dahaa.", translation: "Ya Allah, ampunilah yang hidup di antara kami dan yang mati...", description: "Setelah takbir keempat, dilanjutkan dengan membaca doa penutup." },
            { ...SALAM_JENAZAH, id: 'salam' }
        ]
    },
    {
        id: 'dhuha',
        title: "Sholat Dhuha",
        description: "Panduan sholat sunnah Dhuha (minimal 2 rakaat) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Berdiri tegak. Niatkan sholat Dhuha di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'tahajud',
        title: "Sholat Tahajud",
        description: "Panduan sholat sunnah Tahajud (Tahajjud & Lail) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Persiapan & Niat", arabic: "", latin: "", translation: "", description: "Niatkan sholat Tahajud di dalam hati." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            ...GENERATE_RAKAAT(1),
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...DOA_PERLINDUNGAN, id: 'doa-perlindungan' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'idul_fitri',
        title: "Sholat Idul Fitri",
        description: "Panduan sholat sunnah Idul Fitri (2 rakaat dengan takbir tambahan 7x & 5x) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Niat", arabic: "", latin: "", translation: "", description: "Niat dilakukan di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir-ihram' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            { id: 'extra-takbir-1', title: "Takbir Tambahan (7x)", arabic: "اللهُ أَكْبَرُ (٧x)", latin: "Allahu Akbar (7x)", translation: "Allah Maha Besar", description: "Mengucapkan takbir sebanyak 7 kali pada rakaat pertama sebelum membaca Al-Fatihah." },
            ...GENERATE_RAKAAT(1),
            { id: 'extra-takbir-2', title: "Takbir Tambahan (5x)", arabic: "اللهُ أَكْبَرُ (٥x)", latin: "Allahu Akbar (5x)", translation: "Allah Maha Besar", description: "Mengucapkan takbir sebanyak 5 kali pada rakaat kedua sebelum membaca Al-Fatihah." },
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'idul_adha',
        title: "Sholat Idul Adha",
        description: "Panduan sholat sunnah Idul Adha (2 rakaat dengan takbir tambahan 7x & 5x) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Niat", arabic: "", latin: "", translation: "", description: "Niat dilakukan di dalam hati menghadap kiblat." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir-ihram' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            { id: 'extra-takbir-1', title: "Takbir Tambahan (7x)", arabic: "اللهُ أَكْبَرُ (٧x)", latin: "Allahu Akbar (7x)", translation: "Allah Maha Besar", description: "Mengucapkan takbir sebanyak 7 kali pada rakaat pertama sebelum membaca Al-Fatihah." },
            ...GENERATE_RAKAAT(1),
            { id: 'extra-takbir-2', title: "Takbir Tambahan (5x)", arabic: "اللهُ أَكْبَرُ (٥x)", latin: "Allahu Akbar (5x)", translation: "Allah Maha Besar", description: "Mengucapkan takbir sebanyak 5 kali pada rakaat kedua sebelum membaca Al-Fatihah." },
            ...GENERATE_RAKAAT(2),
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...SALAM, id: 'salam' }
        ]
    },
    {
        id: 'gerhana',
        title: "Sholat Gerhana (Kusuf)",
        description: "Panduan sholat sunnah Gerhana (2 rakaat, masing-masing dengan 2 rukuk) sesuai HPT Muhammadiyah.",
        source: "HPT Muhammadiyah",
        steps: [
            { id: 'start', title: "Niat & Takbir", arabic: "", latin: "", translation: "", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            { ...TAKBIRATUL_IHRAM, id: 'takbir' },
            { ...DOA_IFTITAH, id: 'iftitah' },
            { id: 'r1-fatihah1', ...AL_FATIHAH, title: "[Rakaat 1] Al-Fatihah Pertama" },
            { id: 'r1-ruku1', ...RUKU, title: "[Rakaat 1] Rukuk Pertama" },
            { id: 'r1-itidal1', ...ITIDAL, title: "[Rakaat 1] I'tidal Pertama" },
            { id: 'r1-fatihah2', ...AL_FATIHAH, title: "[Rakaat 1] Al-Fatihah Kedua" },
            { id: 'r1-ruku2', ...RUKU, title: "[Rakaat 1] Rukuk Kedua" },
            { id: 'r1-itidal2', ...ITIDAL, title: "[Rakaat 1] I'tidal Kedua" },
            { id: 'r1-sujud', ...SUJUD, title: "[Rakaat 1] Sujud" },
            { id: 'r2-fatihah1', ...AL_FATIHAH, title: "[Rakaat 2] Al-Fatihah Pertama" },
            { id: 'r2-ruku1', ...RUKU, title: "[Rakaat 2] Rukuk Pertama" },
            { id: 'r2-itidal1', ...ITIDAL, title: "[Rakaat 2] I'tidal Pertama" },
            { id: 'r2-fatihah2', ...AL_FATIHAH, title: "[Rakaat 2] Al-Fatihah Kedua" },
            { id: 'r2-ruku2', ...RUKU, title: "[Rakaat 2] Rukuk Kedua" },
            { id: 'r2-itidal2', ...ITIDAL, title: "[Rakaat 2] I'tidal Kedua" },
            { id: 'r2-sujud', ...SUJUD, title: "[Rakaat 2] Sujud" },
            { ...TASYAHUD_AKHIR, id: 'tasyahud' },
            { ...SALAM, id: 'salam' }
        ]
    }
];

export const KUMPULAN_DOA: DailyPrayer[] = [
    { id: "1", title: "Doa Sebelum Tidur", arabic: "بِاسْمِكَ اللّٰهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوْتُ", latin: "Bismika Allahumma ahya wa bismika amut.", translation: "Dengan nama-Mu ya Allah aku hidup dan dengan nama-Mu aku mati." },
    { id: "2", title: "Doa Bangun Tidur", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِىْ اَحْيَانَا بَعْدَ مَا اَمَاتَنَا وَاِلَيْهِ النُّشُوْرُ", latin: "Alhamdulillahilladzi ahyana ba'da ma amatana wa ilaihin nusyur.", translation: "Segala puji bagi Allah yang telah menghidupkan kami sesudah kami mati (tidur) dan kepada-Nya kami kembali." },
    { id: "3", title: "Doa Sebelum Makan", arabic: "اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allahumma barik lana fima razaqtana waqina 'adzabannar.", translation: "Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka." },
    { id: "4", title: "Doa Sesudah Makan", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مِنَ الْمُسْلِمِيْنَ", latin: "Alhamdulillahilladzi ath'amana wa saqana wa ja'alana minal muslimin.", translation: "Segala puji bagi Allah yang telah memberi kami makan dan minum, serta menjadikan kami seorang muslim." },
    { id: "5", title: "Doa Masuk Kamar Mandi", arabic: "اَللّٰهُمَّ اِنِّيْ اَعُوْذُبِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", latin: "Allahumma inni a'udzubika minal khubutsi wal khabaitsi.", translation: "Ya Allah, aku berlindung kepada-Mu dari godaan setan jantan dan betina." },
    { id: "6", title: "Doa Keluar Kamar Mandi", arabic: "غُفْرَانَكَ الْحَمْدُ لِلّٰهِ الَّذِيْ أَذْهَبَ عَنِّي الْأَذَى وَعَافَنِيْ", latin: "Ghufranaka. Alhamdulillahilladzi adzhaba 'annil adza wa 'afani.", translation: "Dengan mengharap ampunan-Mu, segala puji milik Allah yang telah menghilangkan kotoran dari badanku dan yang telah menyejahterakan." },
    { id: "7", title: "Doa Keluar Rumah", arabic: "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ", latin: "Bismillahi, tawakkaltu 'alallah, laa haula wa laa quwwata illaa billaah.", translation: "Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan kecuali dengan Allah." },
    { id: "8", title: "Doa Minum Obat", arabic: "بِسْمِ اللهِ الشَّافِى", latin: "Bismillahisy syaafii.", translation: "Dengan nama Allah Yang Maha Menyembuhkan." },
    { id: "9", title: "Doa Meminta Kesembuhan", arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ وَأَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا", latin: "Allahumma rabban-nasi, adzhibil-ba’sa, isyfi, wa antas-syafi, la syifa’a illa syifa’uka, syifa’an la yughadiru saqaman.", translation: "Ya Allah, Tuhan manusia, hilangkanlah penyakit dan sembuhkanlah. Engkaulah Maha Penyembuh, tidak ada kesembuhan selain kesembuhan-Mu, kesembuhan yang tidak meninggalkan penyakit." },
    { id: "10", title: "Doa Sebelum Wudhu", arabic: "بِسْمِ اللهِ", latin: "Bismillah.", translation: "Dengan menyebut nama Allah." },
    { id: "11", title: "Doa Sesudah Wudhu", arabic: "أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ. اللَّهُمَّ اجْعَلْنِيْ مِنَ التَّوَّابِيْنَ وَاجْعَلْنِيْ مِنَ الْمُتَطَهِّرِيْنَ", latin: "Asyhadu an laa ilaaha illallaahu wahdahuu laa syariika lah, wa asyhadu anna muhammadan 'abduhuu wa rasuuluh. Allaahummaj'alnii minat tawwaabiina waj'alnii minal mutathahhiriin.", translation: "Aku bersaksi bahwa tiada Tuhan selain Allah Yang Esa, tiada sekutu bagi-Nya, dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya. Ya Allah, jadikanlah aku termasuk orang-orang yang bertaubat dan jadikanlah aku termasuk orang-orang yang mensucikan diri." },
    { id: "12", title: "Dzikir Setelah Sholat Fardhu", arabic: "أَسْتَغْفِرُ اللهَ (x3) اللَّهُمَّ أَنْتَ السَّلاَمُ، وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالْإِكْرَامِ", latin: "Astaghfirullah (3x). Allahumma antas salaam wa minkas salaam tabaarakta yaa dzal jalaali wal ikraam.", translation: "Aku memohon ampun kepada Allah (3x). Ya Allah, Engkau adalah Maha Pemberi Keselamatan, dan dari-Mu lah keselamatan, Maha Suci Engkau, wahai Tuhan Yang Pemilik Keagungan dan Kemuliaan." },
    { id: "13", title: "Doa Untuk Kedua Orang Tua", arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", latin: "Rabbighfirlii wa liwaalidayya warhamhumaa kamaa robbayaanii shoghiiroo.", translation: "Ya Tuhanku, ampunilah dosaku dan dosa kedua orang tuaku, dan sayangilah mereka sebagaimana mereka menyayangiku di waktu kecil." },
    { id: "14", title: "Doa Memohon Ilmu Bermanfaat", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا", latin: "Allahumma inni as'aluka 'ilman naafi'an, wa rizqon thoyyiban, wa 'amalan mutaqobbalan.", translation: "Ya Allah, sesungguhnya aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima." },
    {
        id: "15",
        title: "Do'a Memulai Bekerja",
        arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ\n\nأَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ\n\nرَضِيْتُ بِاللهِ رَبًّا وَبِالْإِسْلَامِ دِيْنًا وَبِمُحَمَّدٍ نَبِيًّا وَرَسُوْلًا\n\nرَبِّ اشْرَحْ لِيْ صَدْرِيْ وَيَسِّرْ لِيْ أَمْرِيْ وَاحْلُلْ عُقْدَةً مِّنْ لِّسَانِيْ يَفْقَهُوْا قَوْلِيْ\n\nاَللّٰهُمَّ إِنِّىْ أَسْأَلُكَ مِنْ خَيْرِ هٰذَا الْعَمَلِ وَخَيْرِ مَا فِيْهِ وَخَيْرِ مَا أُرْسِلْتُ بِهِ، وَأَعُوْذُبِكَ مِنْ شَرِّهِ وَشَرِّ مَا فِيْهِ وَشَرِّ مَا أُرْسِلْتُ بِهِ، إِنَّكَ عَلٰى كُلِّ شَيْءٍ قَدِيْرٌ\n\nاَللّٰهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الْأُمُوْرِ كُلِّهَا وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الْآخِرَةِ",
        latin: "Bismillaahirrohmaanirrohiim.\n\nAsyhadu Allaa ilaaha illallooh wa asyhadu anna Muhammadar rasuululloh.\n\nRodhiitu billaahi robbaa wabil islaami diinaa wabi Muhammadin nabiyyaa wa rasuulaa.\n\nRobbisy-rahlii shodrii wa yassirlii amrii wahlul ‘uqdatammillisaanii yafqohuu qoulii.\n\nAlloohumma innii as-aluka min khoiri hadzal ‘amali wa khoiri maa fihi, wa a‘uudzu bika min syarri hadzal ‘amali wa syarri maa fihi innaka ‘ala kulli syai-in qodiir.\n\nAlloohumma ahsin ‘aaqibatanaa fil-umuur kullihaa wa ajirnaa min khiz-yid dunyaa wa ‘adzaabil aakhirah.",
        translation: "Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang.\n\nAku bersaksi bahwa tiada Tuhan selain Allah, dan aku bersaksi bahwa Muhammad adalah rasul (utusan) Allah.\n\nAku rela Allah sebagai Tuhanku, Islam sebagai agamaku dan Muhammad sebagai Nabi dan utusan Allah.\n\nYa Tuhanku, lapangkanlah dadaku dan mudahkanlah untukku urusanku, dan lepaskanlah kekakuanku dari lidahku, agar mereka mengerti perkataanku.\n\nYa Allah, aku memohon kepada-Mu kebaikan pekerjaan ini dan segala kebaikan yang ada di dalamnya, dan aku berlindung kepada-Mu daripada keburukan pekerjaan ini dan segala keburukan yang ada di dalamnya, sesungguhnya Engkau-lah yang Maha Berkuasa menentukannya.\n\nYa Allah, perbaikilah hasil setiap urusan kami semuanya, dan hindarkanlah kami dari kehinaan dunia dan siksaan akhirat."
    },
    { id: "16", title: "Doa Naik Kendaraan", arabic: "سُبْحَانَ الَّذِىْ سَخَّرَلَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِيْنَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُوْنَ", latin: "Subhanalladzi sakhara lana hadza wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.", translation: "Maha Suci Allah yang telah menundukkan semua ini bagi kami padahal kami sebelumnya tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami." },
    { id: "17", title: "Doa Masuk Masjid", arabic: "اَللّٰهُمَّ افْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ", latin: "Allahummaftah li abwaba rahmatik.", translation: "Ya Allah, bukalah untukku pintu-pintu rahmat-Mu." },
    { id: "18", title: "Doa Keluar Masjid", arabic: "اَللّٰهُمَّ إِنِّيْ أَسْأَلُكَ مِنْ فَضْلِكَ", latin: "Allahumma inni as-aluka min fadhlika.", translation: "Ya Allah, sesungguhnya aku memohon kepada-Mu akan karunia-Mu." },
    { id: "19", title: "Doa Bercermin", arabic: "اَللّٰهُمَّ كَمَا حَسَّنْتَ خَلْقِيْ فَحَسِّنْ خُلُقِيْ", latin: "Allahumma kama hassanta khalqi fahassin khuluqi.", translation: "Ya Allah, sebagaimana Engkau telah membaguskan penciptaanku, maka baguskanlah pula akhlakku." },
    { id: "20", title: "Doa Berpakaian", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِيْ كَسَانِيْ هَذَا الثَّوْبَ وَرَزَقَنِيْهِ مِنْ غَيْرِ حَوْلٍ مِنِّيْ وَلَا قُوَّةٍ", latin: "Alhamdulillahilladzi kasani hadzats tsauba wa razaqanihi min ghairi haulin minni wa la quwwatin.", translation: "Segala puji bagi Allah yang telah memakaikan pakaian ini kepadaku and mengaruniakannya kepadaku tanpa daya dan kekuatan dariku." },
    { id: "21", title: "Doa Sapu Jagat", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", latin: "Rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina 'adzaban nar.", translation: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat dan peliharalah kami dari siksa neraka." },
];

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'tahajud-streak-3',
        name: 'Pejuang Malam I',
        description: 'Melaksanakan sholat Tahajud selama 3 hari berturut-turut.',
        icon: 'MoonIcon',
        criteria: {
            type: 'streak',
            entityId: 'tahajud',
            count: 3
        }
    },
    {
        id: 'subuh-jamaah-streak-7',
        name: 'Pejuang Subuh',
        description: 'Melaksanakan sholat Subuh selama 7 hari berturut-turut.',
        icon: 'SunIcon',
        criteria: {
            type: 'streak',
            entityId: 'subuh',
            count: 7
        }
    }
];
