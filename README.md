# Czech Salivary Gland Database

Czech Salivary Gland Database je nástroj vyvíjený na Západočeské univerizě v Plzni, sloužící k zjednodušení shromažďování a analýze dat pacientů s nádory velkých slinných žláz.

## Obsah

- [Uživatelská příručka](#uživatelská-příručka)
  - [Instalace aplikace](#instalace-aplikace)
  - [První spuštění aplikace](#první-spuštění-aplikace)
  - [Základní popis uživatelského rozhraní aplikace](#základní-popis-uživatelského-rozhraní-aplikace)
  - [Přidávání pacientů](#přidávání-pacientů)
  - [Editace dat o pacientovi](#editace-dat-o-pacientovi)
  - [Mazání pacientů](#mazání-pacientů)
  - [Vyhledávání a filtrace v seznamu pacientů](#vyhledávání-a-filtrace-v-seznamu-pacientů)
  - [Export pacientů](#export-pacientů)
  - [Přidávání studií](#přidávání-studií)
  - [Editace studií](#editace-studií)
  - [Odebírání pacientů ze studie](#odebírání-pacientů-ze-studie)
    - [Odebírání pacientů ze studie v části Seznam pacientů](#odebírání-pacientů-ze-studie-v-části-seznam-pacientů)
    - [Odebírání pacientů ze studie v části Studie](#odebírání-pacientů-ze-studie-v-části-studie)
  - [Přidávání pacienta do existující studie](#přidávání-pacienta-do-existující-studie)
  - [Zobrazení křivek přežití/recidivy](#zobrazení-křivek-přežitírecidivy)
  - [Importování dat](#importování-dat)
  - [Prognostický modul](#prognostický-modul)
    - [Výpočet predikce](#výpočet-predikce)
    - [Trénování modelu](#trénování-modelu)
    - [Informace o modelech](#informace-o-modelech)
- [Vlastní překlad zdrojového kódu](#vlastní-překlad-zdrojového-kódu)
- [Licence](#licence)


## Uživatelská příručka

### Instalace aplikace

1. Stáhněte [instalační soubor](https://github.com/vjelinekk/CzechSalivaryGlandDB_v2/releases/download/v1.0.0/csgdb-1.0.0-Setup.exe).
2. Spusťte instalační soubor `csgdb-1.0.0-Setup.exe`.
3. Ve vyskakovacím okně postupujte podle následujícího obrázku:
4. ![](/readme_images/instalace.jpg)
5. Nyní je aplikace nainstalována pod názvem `csgdb`.

### První spuštění aplikace

1. Spusťte aplikaci `csgdb`.
2. Po spuštění je zobrazeno následující dialogové okno:
3. ![](/readme_images/volba_zabezpeceni.png)
4. Nyní volíte zda chcete využívat zabezpečenou verzi aplikace a máte dvě možnosti:
    - _Ano_: možnost zvolte pokud plánujete do aplikace ukládat reálná data o pacientech.
    - _Ne_: možnost zvolte pouze v případě, že aplikaci chcete jen testovat a nebudete ukládat reálná data.
5. V případě, že jste zvolili možnost _Ano_ je Vám nyní zobrazeno toto dialogové okno:
6. ![](/readme_images/login_form_phase_2.png)
7. V dialogovém okně si nastavte heslo pomocí, kterého se budete do aplikace při každém jejím spuštění přihlašovat. **Heslo nesmíte zapomenout jinak přijdete o přístup k datům.**
8. Dále je pro Vás vygenerován šifrovací klíč. Ten si uschovejte na bezpečné místo. **V případě ztráty šifrovacího klíče nebude možné zobrazit osobní údaje o pacientech.**
9. Nyní už jen stačí kliknout na tlačítko _Přihlásit se_.

### Základní popis uživatelského rozhraní aplikace

![](/readme_images/layout.png)

-   V levé části okna aplikace se nachází menu pomocí, kterého můžete zobrazovat jednotlivé funkcionality aplikace.
-   Po zvolení některé z možností v menu jsou zobrazeny všechny prvky, patřící této části, v centrální části okna aplikace.

### Přidávání pacientů

1. Nejprve v menu klikněte na tlačítko _Přidat pacienta_.
2. Následně jsou zobrazena tři tlačítka, která vám umožňují zvolit, kterou ze tří žláz má pacient postiženou:
3. ![](/readme_images/tvorba_pacienta_1.png)
4. Po zvolení žlázy je zobrazen formulář:
5. ![](/readme_images/form_1.png)
6. Nyní můžete vyplňovat jednotlivé údaje o pacientovi.
7. Jakmile budete chtít přidat pacienta do databáze musíte nejprve dojít na konec formuláře, kde naleznete tlačítko _Přidat pacienta_.
8. Po stisknutí tlačítka _Přidat pacienta_ budete přesunuti do _Seznamu pacientů_ a Vámi nově přidaný pacient bude vybrán:
9. ![](/readme_images/tvorba_pacienta_2.png)

### Editace dat o pacientovi

1. Pokud chcete editovat data o pacientovi musíte se přesunout do části _Seznam pacientů_ nebo _Studie_ (kde máte zobrazený seznam pacientů ve studii) a zde najít konkrétního pacienta.
2. Zde zvolíte, kterého pacienta chcete editovat.
3. Následně umožníte editaci stisknutím tlačítka _Editovat_, které se nachází v pravém horním rohu:
4. ![](/readme_images/editace_pacienta.png)
5. Nyní můžete libovolně editovat údaje o zvoleném pacientovi.
6. V případě, že chcete provedené změny uložit stiskněte tlačítko _Uložit změny_. Jestliže změny nechcete uložit stačí stisknout tlačítko _Zrušit editaci_.
7. ![](/readme_images/pacient_edit.png)

### Mazání pacientů

1. Pokud chcete smazat pacienta musíte se nacházet v části _Seznam pacientů_ nebo _Studie_, kde máte zobrazený seznam pacientů ve studii.
2. Následně zvolte pacienta, kterého chcete smazat a klikněte na tlačítko _Smazat pacienta_ v pravém horním rohu.
3. ![](/readme_images/editace_pacienta.png)
4. Po kliknutí na toto tlačítko je Vám zobrazeno dialogové okno, které se ptá na to, zda opravdu chce pacienta smazat:
5. ![](/readme_images/potvrzeni_mazani_pacienta.png)
6. Poté, co kliknete na tlačítko _SMAZAT_ bude pacient odstraněn z databáze.

### Vyhledávání a filtrace v seznamu pacientů

-   Pokud se nacházíte v části aplikace _Seznam pacientů_ nebo _Studie_, kde máte zobrazený seznam pacientů, ve studii můžete vyhledávat pacienta podle **jména, příjmení a rodného čísla** pomocí vstupního pole, které je označeno názvem _Vyhledat..._:
-   ![](/readme_images/seznam_detail.png)
-   Dále je možné filtrovat pacienty pomocí kliknutím na tlačítko _Filtrovat_
    -   To Vám zobrazí filtrační menu:
    -   ![](/readme_images/filtracni_menu.png)
    -   V tomto menu můžete nastavit, podle jakých hodnot chcete pacienty filtrovat, a následně kliknutím na tlačítko _ULOŽIT FILTR_ se aplikuje vámi nastavený filtr.
    -   Pokud chcete filtr smazat, stačí kliknout na tlačítko _RESETOVAT FILTR_

### Export pacientů

1. Musíte se nacházet v části _Seznam pacientů_ nebo _Studie_, kde máte otevřený seznam pacientů v dané studii.
2. Nyní musíte zvolit pacienty pro export a to buď klikáním na boxy u jednotlivých pacientů, nebo v případě exportu všech pacientů v seznamu stisknutím tlačítka _Označit vše_:
3. ![](/readme_images/seznam_detail.png)
4. Po zvolení pacientů pro export si můžete vybrat mezi normálním a anonymizovaným exportem.
5. Kliknutím na jedno z těchto tlačítek se Vám zobrazí dialogové okno vygenerované Vaším operačním systémem, ve kterém nadefinujete adresář kam chcete exportovaná data uložit.
6. Následně jsou data uložena do Vámi určeného adresáře ve formátu `.xls`. A pro každý typ žlázy je vytvořen jeden soubor.

### Přidávání studií

1. Přesuňte se do části menu _Přidat studii_.
2. Nyní můžete zvolit pro, kterou žlázu chcete studii vytvořit (speciální studie může obsahovat všechny žlázy):
3. ![](/readme_images/volba_studie.png)
4. Po tom, co provedete volbu typu studie, bude vám zobrazen seznam pacientů, které je možné do daného typu studie zařadit:
5. ![](/readme_images/tvorba_studie.png)
6. Nyní můžete zvolit klikáním na boxy u jednotlivých pacientů nebo tlačítkem _Označit vše_ pacienty, které chcete vložit do studie.
7. Následně zadejte název studie do vstupního pole a klikněte na tlačítko _Vytvořit novou studii_
8. To Vás přenese do části _Studie_ a vybere Vámi vytvořenou novou studii:
9. ![](/readme_images/nova_studie.png)

### Editace studií

-   Pokud chcete editovat studii, musíte se nacházet v části _Studie_.
-   Zde pomocí tlačítka s ikonou tužky můžete měnit název studie a pomocí tlačítka s ikonou koše můžete smazat studii:
-   ![](/readme_images/studie_edit.png) 
- V případě editace názvu studie se místo aktuálního názvu zobrazí vstupní pole, do kterého můžete zadat nový název: 
- ![](/readme_images/editace_studie_2.png) 
- Stisknutím tlačítka s ikonou _fajfky_ uložíte nový název a kliknutím na tlačítko s ikonou křížku zrušíte editaci názvu studie. 
- Pokud kliknete na tlačítko s ikonou koše, zobrazí se Vám dialogové okno, které Vás žádá o potvrzení smazání studie: 
- ![](/readme_images/mazani_studie.png) 
- Pokud kliknete na tlačítko _SMAZAT_, bude studie odstraněna z databáze.

### Odebírání pacientů ze studie

-   Pacienty můžete odebírat ze studie jak v části _Seznam pacientů_, tak v části _Studie_.

#### Odebírání pacientů ze studie v části _Seznam pacientů_

1. Přejděte do části _Seznam pacientů_
2. Vyberte pacienta, kterého chcete odebrat z nějaké studie.
3. Dojděte na konec formuláře pacienta.
4. Klikněte na tlačítko _Editovat_ v pravém horním rohu.
5. V části formuláře _Studie_ odeberte vybrané studie, u kterých nechcete, aby byl pacient jejich součástí:
6. ![](/readme_images/sezna_odebrani_ze_studie.png)
7. Následně klikněte na tlačítko _Uložit změny_ v pravém horním rohu a pacient bude odstraněn z vybraných studií.

#### Odebírání pacientů ze studie v části _Studie_

1. Přejděte do části _Studie_.
2. Vyberte studii, ze které chcete pacienty odebrat.
3. V seznamu pacientů dané studie vyberte pacienta, kterého chcete odebrat.
4. Zobrazte si formulář pacienta kliknutím na něj.
5. V pravém horním rohu klikněte na tlačítko _Odebrat ze studie_:
6. ![](/readme_images/studie_odebrani_pacienta.png)
7. Následně se zobrazí dialogové okno, které vyžaduje potvrzení odebrání pacienta ze studie:
8. ![](/readme_images/odebrat_ze_studie.png)
9. Kliknutím na tlačítko _ODEBRAT_ bude pacient odebrán ze studie.

### Přidávání pacienta do existující studie

1. Přejděte do části _Seznam pacientů_.
2. Vyberte pacienta, kterého chcete přidat do existující studie.
3. Dojděte na konec formuláře vybraného pacienta a klikněte na tlačítko _Editovat_ v pravém horním rohu:
4. ![](/readme_images/pridani_do_ex_studie.png)
5. V části formuláře _Studie_ vyberte studii/studie, do kterých chcete pacienta přidat.
6. Klikněte na tlačítko _Uložit změny_ pro přidání pacienta do studie/studií.

### Zobrazení křivek přežití/recidivy

1. Přejděte do části _Kaplan-Meier_.
2. Vyberte typ křivky a histopatologické typy nádoru, pro které chcete zobrazit křivku:
3. ![](/readme_images/kaplan-meier.png)
4. Po zvolení typu křivky a určení skupin podle histopatologického typu nádoru jsou vykresleny křivky pomocí Kaplan-Meierovy metody.
5. Křivky jsou vykresleny jenom pro pacienty, kteří mají definovaný:
    - v případě křivky přežití: _Histopatologie_, _Rok diagnózy_ a _Datum úmrtí_,
    - v případě křivky recidivy: _Histopatologie_, _Rok diagnózy_ a _Datum prokázání recidivy_.

### Importování dat

1. Klikněte na tlačítko _Importovat data_ v menu aplikace.
2. Následně se zobrazí dialogové okno vygenerované operačním systémem, pomocí kterého určíte soubor, ze kterého chcete importovat data.
3. Po zvolení souboru se provede import dat.

### Prognostický modul

#### Výpočet predikce
1. Přejděte do části _Seznam pacientů_.
2. Vyberte pacienta, pro kterého chcete vypočítat prognostické skóre
3. Klikněte na ikonu hlavy s ozubeným kolečkem v pravém horním rohu:
4. ![](/readme_images/predikce_vypocet_1.png)
5. Vyberte jaký typ predikce, chcete vypočítat:
6. ![](/readme_images/predikce_vypocet_2.png)
7. Klikněte na tlačítko _Vypočítat riziko_
8. Provede se výpočet a uvidíte výsledek:
9. ![](/readme_images/predikce_vypocet_3.png)

#### Trénování modelu
1. Přejděte do části _Predikce rizik (ML)_
2. Vyberte jaký model chcete trénovat:
3. ![](/readme_images/predikce_trenink_1.png)
4. Spusťte trénink pomocí tlačítka _Trénovat model_
5. Po dokončení tréninku je zobrazen výsledek trénovaní:
6. ![](/readme_images/predikce_trenink_2.png)

#### Informace o modelech
1. Přejděte do části _Predikce rizik (ML)_
2. Překliněte se na záložku _Informace o modelech_
3. ![](/readme_images/predikce_info.png)
4. Zde je vidět seznam všech natrénovaných a aktivních modelů

## Vlastní překlad zdrojového kódu
1. Pokud již nemáte, nejprve musíte nainstalovat [`NodeJS`](https://nodejs.org/en/download). Zároveň s `NodeJS` bude automatický nainstalováno `NPM`.
2. Ověření úspěšné instalace, lze provést pomocí příkazu:
> npm --version
3. Přejděte do složky `python-ml-engine` a spusťte skript `build.sh`:
> cd python-ml-engine && bash build.sh

> cd ..

> mkdir ml_engine

> mv python-ml-engine/dist/ml_engine.exe ml_engine/
4. Nainstalujte potřebné knihovny pomocí příkazu:
> npm install
5. Přeložte zdrojový kód pomocí příkazu:
> npm run make
6. Ve složce `out` jsou nyní vygenerovány dva adresáře:
  - `csgdb-win32-x64`
    - Adresář obsahuje sestavený soubor `csgdb.exe`, který lze spustit.
  - `make`
    - Adresář na cestě `\make\squirrel.windows\x64\` obsahuje instalační soubory aplikace.

## Licence
Software je licencován pod [GNU General Public License V3](./LICENSE)

 
