# Czech Salivary Gland Database (CSGDB)

<p align="center">
  <img src="docs/user-guide-cz/img/LOGO_splt.png" alt="CSGDB Logo" width="600"/>
</p>

**Czech Salivary Gland Database** je aplikovaný softwarový nástroj vyvíjený na Západočeské univerzitě v Plzni, sloužící k efektivnímu shromažďování, správě a pokročilé statistické i prognostické analýze dat pacientů s nádory velkých slinných žláz.

---

## Obsah

- [Uživatelská příručka](#uživatelská-příručka)
  - [Instalace aplikace](#instalace-aplikace)
  - [První spuštění aplikace](#první-spuštění-aplikace)
  - [Základní popis uživatelského rozhraní](#základní-popis-uživatelského-rozhraní)
  - [Přidávání nového pacienta](#přidávání-nového-pacienta)
  - [Plánované kontroly](#plánované-kontroly)
  - [Editace a mazání pacientů](#editace-a-mazání-pacientů)
  - [Vyhledávání a filtrace v seznamu pacientů](#vyhledávání-a-filtrace-v-seznamu-pacientů)
  - [Export pacientů](#export-pacientů)
  - [Práce se studiemi](#práce-se-studiemi)
  - [Zobrazení křivek přežití a recidivy (Kaplan-Meier)](#zobrazení-křivek-přežití-a-recidivy-kaplan-meier)
  - [Inferenční statistika](#inferenční-statistika)
  - [Deskriptivní statistika](#deskriptivní-statistika)
  - [Prognostický modul (Predikce rizik ML)](#prognostický-modul-predikce-rizik-ml)
  - [Importování dat](#importování-dat)
  - [Zálohování a obnova databáze](#zálohování-a-obnova-databáze)
- [Vlastní překlad zdrojového kódu](#vlastní-překlad-zdrojového-kódu)
- [Licence](#licence)

---

## Uživatelská příručka

Kompletní vysázenou příručku ve formátu PDF naleznete v [docs/user-guide-cz/user-guide-cz.pdf](docs/user-guide-cz/user-guide-cz.pdf).

### Instalace aplikace

1. Stáhněte si nejnovější instalační soubor z oficiální stránky [GitHub Releases](https://github.com/vjelinekk/CzechSalivaryGlandDB/releases) (případně přímo z vydání [v3.0.9](https://github.com/vjelinekk/CzechSalivaryGlandDB/releases/tag/v3.0.9)).
2. Spusťte stažený instalační soubor (např. `csgdb-3.0.9-Setup.exe`).
3. V průběhu instalace postupujte podle pokynů v instalačním okně:
   ![Průběh instalace](docs/user-guide-cz/img/instalace.jpg)
4. Po dokončení instalace je aplikace nainstalována a připravena k použití pod názvem `csgdb`.

### První spuštění aplikace

1. Spusťte aplikaci `csgdb`.
2. Při prvním spuštění zvolte v dialogovém okně režim zabezpečení:
   ![Volba zabezpečení](docs/user-guide-cz/img/volba_zabezpeceni.png)
   - **Ano**: Zvolte, pokud budete do aplikace ukládat reálná data pacientů (citlivá osobní data budou šifrována).
   - **Ne**: Zvolte pouze pro účely testování.
3. V případě volby **Ano** nastavte přístupové heslo a bezpečně uschovejte vygenerovaný šifrovací klíč:
   ![Vygenerování klíče a hesla](docs/user-guide-cz/img/vytvoreni_hesla.png)
4. Dokončete nastavení kliknutím na tlačítko *Přihlásit se*.

> **DŮLEŽITÉ UPOZORNĚNÍ K BEZPEČNOSTI DAT**
> - **Heslo nesmíte zapomenout** – bez hesla se do aplikace nepřihlásíte a přístup k datům bude zablokován.
> - **Šifrovací klíč uschovejte na bezpečném místě** – bez klíče nelze dešifrovat osobní údaje o pacientech.

### Základní popis uživatelského rozhraní

Okno aplikace je rozděleno do tří hlavních částí:
![Rozvržení rozhraní](docs/user-guide-cz/img/rozhrani.png)

1. **Levé navigační menu**: Přepínání mezi moduly pacientů, studií, statistiky, prognóz, importu a zálohování (včetně možnosti změny jazyka).
2. **Střední panel (Ovládací a seznamový)**: Vyhledávací pole, tlačítka filtrace, tlačítka exportu a seznam vybraných záznamů.
3. **Pravý panel (Pracovní plocha)**: Zobrazení karty pacienta, formulářů, grafů a výsledků statistických výpočtů.

### Přidávání nového pacienta

1. V levém menu klikněte na tlačítko **Přidat pacienta**.
2. Zvolte charakter nádoru (**Nezhoubný nádor** / **Zhoubný nádor**):
   ![Volba typu nádoru](docs/user-guide-cz/img/pridani-pacienta/pridani_1.png)
3. Zvolte postiženou slinnou žlázu (**Příušní**, **Podčelistní**, **Podjazyková**):
   ![Výběr žlázy](docs/user-guide-cz/img/pridani-pacienta/pridani_2.png)
4. Vyplňte generovaný formulář osobních, demografických a klinických dat:
   ![Formulář pacienta](docs/user-guide-cz/img/pridani-pacienta/pridani_3.png)
5. Na konci formuláře klikněte na tlačítko **Přidat pacienta**. Pacient bude uložen a budete přesměrováni do seznamu pacientů.

### Plánované kontroly

Modul pro přehlednou časovou evidenci a plánování nadcházejících kontrol pacientů.

1. V levém menu klikněte na **Plánované kontroly**.
2. Nastavte požadovaný časový rozsah v polích **Od** a **Do**.
3. Na ploše se zobrazí kalendářové karty rozdělené podle dnů s evidovanými kontrolami:
   ![Plánované kontroly](docs/user-guide-cz/img/planovane-kontroly/planovane_kontroly_1.png)
4. Pomocí modrého tlačítka **EXPORT PDF** v pravém horním rohu můžete vytisknout nebo uložit dokument ve formátu PDF.

### Editace a mazání pacientů

1. V **Seznamu pacientů** nebo ve **Studii** vyberte požadovaného pacienta.
2. V pravém horním rohu pracovní plochy stiskněte modré tlačítko s ikonou tužky a vyberte **EDITOVAT**:
   ![Režim editace](docs/user-guide-cz/img/editace-pacienta/edit_1.png)
   ![Možnosti akcí](docs/user-guide-cz/img/editace-pacienta/edit_2.png)
3. Po úpravě údajů stiskněte **ULOŽIT ZMĚNY** (případně **ZRUŠIT EDITACI**). Pro trvalé odstranění stiskněte **SMAZAT PACIENTA**:
   ![Uložení změn a mazání](docs/user-guide-cz/img/editace-pacienta/edit_3.png)

### Vyhledávání a filtrace v seznamu pacientů

- **Rychlé vyhledávání**: Pomocí pole *Vyhledat...* v reálném čase podle jména, příjmení nebo rodného čísla:
  ![Rychlé vyhledávání](docs/user-guide-cz/img/vyhledavani-a-filtrace/vyhledavani_a_filtrace_1.png)
- **Pokročilá filtrace**: Stisknutím tlačítka **FILTROVAT** otevřete postranní menu pro komplexní nastavení kritérií:
  ![Filtrační menu](docs/user-guide-cz/img/vyhledavani-a-filtrace/vyhledavani_a_filtrace_2.png)
  - Pro aplikaci filtru klikněte na zelené tlačítko **ULOŽIT FILTR**.
  - Pro zrušení filtru klikněte na oranžové tlačítko **RESETOVAT FILTR**.

### Export pacientů

1. V seznamu pacientů označte záznamy (ručně zaškrtnutím nebo tlačítkem **OZNAČIT VŠE**).
2. V horním panelu zvolte požadovaný typ exportu:
   ![Export pacientů](docs/user-guide-cz/img/export/export_1.png)
   - **Exportovat**: Standardní export všech údajů do Excelu (`.xls`).
   - **Exportovat anonymizovaně**: Export bez osobních identifikátorů.
3. Zvolte cílovou složku. Pro každý typ žlázy je automaticky vygenerován samostatný soubor `.xls`.

### Práce se studiemi

- **Vytvoření nové studie**: V menu zvolte **Přidat studii**, vyberte cílovou žlázu (nebo speciální studii), zadejte název, zaškrtněte pacienty a stiskněte **VYTVOŘIT NOVOU STUDII**:
  ![Výběr typu studie](docs/user-guide-cz/img/pridani-studie/pridani_1.png)
  ![Vytvoření studie](docs/user-guide-cz/img/pridani-studie/pridani_2.png)
- **Editace a mazání studie**: V záložce **Studie** použijte ikonu tužky pro přejmenování nebo ikonu popelnice pro smazání studie:
  ![Změna názvu studie](docs/user-guide-cz/img/editace-studie/editace_1.png)
  ![Režim úpravy názvu](docs/user-guide-cz/img/editace-studie/editace_2.png)
- **Přidání pacienta do studie**: Přímo v kartě pacienta v sekci **Studie** zaškrtněte požadované studie a uložte změny:
  ![Zařazení z karty pacienta](docs/user-guide-cz/img/pridani-do-studie/pridani_1.png)

### Zobrazení křivek přežití a recidivy (Kaplan-Meier)

1. V menu přejděte do části **Kaplan-Meier**.
2. Zvolte typ analýzy (přežití / recidiva) a definujte srovnávané histopatologické skupiny:
   ![Modul Kaplan-Meier](docs/user-guide-cz/img/kaplan-meier/kaplan_meier_1.png)
3. Aplikace automaticky vykreslí Kaplan-Meierovy křivky nad pacienty s kompletními daty.

### Inferenční statistika

Modul pro statistické testování hypotéz a ověřování závislostí mezi proměnnými:

1. V menu přejděte do záložky **Inferenční statistika**.
2. Zvolte požadovaný test (**Chi-kvadrát test**, **Fisherův exaktní test**, **T-Test**, **Mann-Whitney U test**), velikost kontingenční matice a verzi TNM (TNM8 / TNM9):
   ![Volba testu a parametrů](docs/user-guide-cz/img/inferencni-statistika/inf_stat_1.png)
3. Definujte řádkové a sloupcové kategorie výběrem klinických proměnných:
   ![Řádkové kategorie](docs/user-guide-cz/img/inferencni-statistika/inf_stat_2.png)
   ![Sloupcové kategorie](docs/user-guide-cz/img/inferencni-statistika/inf_stat_3.png)
4. Nastavte hladinu významnosti (např. 5 %) a stisknutím tlačítka **VYPOČÍTAT CHI-KVADRÁT** spuste výpočet p-hodnoty a testové statistiky:
   ![Kontingenční matice a výpočet](docs/user-guide-cz/img/inferencni-statistika/inf_stat_4.png)

### Deskriptivní statistika

Modul pro základní sumarizační přehled a popis datového souboru pacientů v databázi (distribuce věku, pohlaví, typů nádorů a stadií TNM).

### Prognostický modul (Predikce rizik ML)

Využívá algoritmy strojového učení (*Random Survival Forest*, *Cox PH*) pro odhad rizikového skóre:

- **Výpočet predikce**: Na kartě pacienta klikněte na ikonu hlavy s ozubeným kolem, zvolte cílovou proměnnou a spuste výpočet:
  ![Ikona predikce](docs/user-guide-cz/img/prognosticky-modul/predikce_vypocet_1.png)
  ![Nastavení predikce](docs/user-guide-cz/img/prognosticky-modul/predikce_vypocet_2.png)
  ![Výsledky predikce](docs/user-guide-cz/img/prognosticky-modul/predikce_vypocet_3.png)
- **Trénování nového modelu**: V záložce **Predikce rizik (ML)** natrénujte vlastní model nad aktuálními daty v databázi:
  ![Trénování modelu](docs/user-guide-cz/img/prognosticky-modul/predikce_trenink_1.png)
  ![Výsledné metriky tréninku](docs/user-guide-cz/img/prognosticky-modul/predikce_trenink_2.png)
- **Správa modelů**: Přehled natrénovaných i předtrénovaných modelů a nastavení jejich aktivity:
  ![Správa modelů](docs/user-guide-cz/img/prognosticky-modul/predikce_info.png)

### Importování dat

1. V menu klikněte na **Importovat data**.
2. Zvolte datový soubor v dialogovém okně operačního systému.
3. Data budou automaticky zpracována a importována do databáze.

### Zálohování a obnova databáze

- **Zálohování databáze**: Kliknutím na položku **Zálohovat databázi** v menu a zvolením cílové složky uložíte kompletní kopii databáze (soubor `.sqlite`).
- **Obnovení databáze ze zálohy**: Kliknutím na položku **Obnovit databázi** vyberete záložní soubor `.sqlite`, kterým nahradíte stávající databázi.

---

## Vlastní překlad zdrojového kódu

1. Pokud již nemáte, nejprve musíte nainstalovat [`Node.js`](https://nodejs.org/en/download). Zároveň s `Node.js` bude automaticky nainstalováno `NPM`.
2. Ověření úspěšné instalace lze provést pomocí příkazu:
   ```bash
   npm --version
   ```
3. Přejděte do složky `python-ml-engine` a spusťte skript `build.sh`:
   ```bash
   cd python-ml-engine && bash build.sh
   cd ..
   mkdir -p ml_engine
   mv python-ml-engine/dist/ml_engine.exe ml_engine/
   ```
4. Nainstalujte potřebné knihovny pomocí příkazu:
   ```bash
   npm install
   ```
5. Přeložte zdrojový kód pomocí příkazu:
   ```bash
   npm run make
   ```
6. Ve složce `out` jsou nyní vygenerovány adresáře se sestavenou aplikací a instalačními balíčky.

---

## Licence

Software je licencován pod [GNU General Public License V3](./LICENSE).
