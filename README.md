# Projekt-Zespolowy

To jest moduł służący do wizualnego projektowania szablonów raportów, który integruje się z naszą bazą danych.  
Umożliwia tworzenie układów PDF (tekst, obrazy, kody QR) i zapisywanie ich struktury w formacie JSON.

---

# Co zostało zrobione?

## Frontend (React)

- Integracja z biblioteką **pdfme** (wizualny Designer).
- Mechanizm przesyłania gotowego schematu JSON do API.
- Obsługa dynamicznej nazwy raportu.

## Backend (.NET 8)

- Konfiguracja połączenia z bazą **PostgreSQL** przez **EF Core**.
- Stworzenie modelu `ReportTemplate` z obsługą typu **JSONB** (dla elastyczności szablonów).
- Endpointy API do pobierania i zapisywania szablonów.
- Skonfigurowana polityka **CORS** dla lokalnego środowiska deweloperskiego.

## Baza Danych (PostgreSQL)

Tabela `ReportTemplates` przechowująca nazwy i pełne schematy projektów.

---

# Instrukcja uruchomienia (Docker Compose)

Projekt został skonfigurowany do łatwego uruchamiania za pomocą Dockera. Nie musisz ręcznie instalować Node.js, .NET SDK ani serwera bazy danych PostgreSQL (wszystko uruchomi się w kontenerach).

## 1. Wymagania systemowe

- Zainstalowany **Docker** oraz **Docker Compose**
  
*(Jeżeli nie masz Dockera, pobierz i zainstaluj np. [Docker Desktop](https://www.docker.com/products/docker-desktop).)*

---

## 2. Uruchomienie projektu

1. Otwórz terminal (wiersz poleceń) w głównym katalogu projektu (tam gdzie znajduje się plik `docker-compose.yml`).
2. Uruchom wszystkie usługi za pomocą polecenia:

```bash
docker compose up --build -d
```
*(Flaga `--build` wymusi zbudowanie obrazów przy pierwszej instalacji. Flaga `-d` uruchomi kontenery w tle).*

Gdy kontenery się uruchomią, automatycznie zostanie postawiona baza danych PostgreSQL, backend API (.NET) oraz frontend aplikacji (React).

---

## 3. Dostęp do aplikacji

Po uruchomieniu kontenerów poszczególne elementy systemu są dostępne pod następującymi adresami:

- **Frontend (Visual Designer)**: 
  👉 [http://localhost:5174](http://localhost:5174)

- **Backend API**: 
  👉 http://localhost:5000

- **Baza danych (PostgreSQL)**:
  - Host: `localhost` (z wewnątrz kontenerów nazywa się `db`)
  - Port: `5432`
  - Nazwa bazy: `PdfReportsDb`
  - Użytkownik: `postgres`
  - Hasło: `SecretPassword123!`

---

## Zatrzymanie aplikacji

Aby zatrzymać kontenery (bez kasowania danych), użyj polecenia w tym samym folderze:

```bash
docker compose down
```

Dane zostają zachowane na stałym wolumenie dockerowym, więc po ponownym uruchomieniu wcześniejsze szablony wciąż tam będą!

---

# Instrukcja uruchomienia lokalnie (bez Dockera)

Jeżeli wolisz uruchomić aplikację tradycyjnie (np. w celach deweloperskich), wykonaj poniższe kroki.

## 1. Wymagania systemowe

- **Node.js** (wersja 18+)
- **.NET 8 SDK**
- **PostgreSQL**

## 2. Konfiguracja Bazy Danych

1. Otwórz **pgAdmin 4** (lub inne narzędzie SQL).
2. Stwórz nową bazę danych o nazwie: `PdfReportsDb`
3. Przejdź do pliku: `RaportApp/RaportApp/appsettings.json` lub użyj `appsettings.Development.json`
4. Zmodyfikuj ciąg połączenia (ConnectionString), tak aby wskazywał na Twój lokalny serwer PostgreSQL:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=PdfReportsDb;Username=postgres;Password=TWOJE_HASLO"
}
```

## 3. Uruchomienie Backend-u (.NET)

1. Otwórz rozwiązanie w **Visual Studio** (`.slnx` lub `.sln` w folderze `RaportApp`).
2. Otwórz **Package Manager Console** na dole ekranu i wpisz:
```powershell
Update-Database
```
*(Stworzy to niezbędne tabele w Twojej lokalnej bazie danych).*

3. Uruchom projekt (`F5`). API wystartuje na porcie `http://localhost:5000`.

## 4. Uruchomienie Frontendu (React)

1. Otwórz terminal wewnątrz folderu `raport-frontend`.
2. Zainstaluj niezbędne biblioteki NPM:
```bash
npm install
```
3. Uruchom tryb deweloperski aplikacji:
```bash
npm run dev
```
4. Aplikacja powinna być dostępna w przeglądarce pod adresem: `http://localhost:5174` (lub `http://localhost:5173` - sprawdź adres sugerowany przez terminal).

---

# Uwagi do rozwoju

- Szablony są zapisywane jako obiekty **JSON** w kolumnie `SchemaContent`.
- Obecnie edytor startuje z **pustą stroną A4**.
- Porty są ustawione na:
  - Backend → `5000`
  - Frontend → `5174`

Jeśli React uruchomi się na innym porcie, pamiętaj o sprawdzeniu ustawień **CORS w `Program.cs`**.

---


### Aktualizacja Projektu: Wprowadzenie Realnych Danych i Generatora

Ostatnie zmiany skupiły się na pełnej integracji przepływu danych:  
**od bazy PostgreSQL → przez API → aż po gotowy plik PDF.**

---

### 1. Rozbudowa Bazy Danych (Backend)

- **Nowy Model `Client`**  
  Dodano tabelę klientów w PostgreSQL:
  - `Id`
  - `Name`
  - `City`
  - `Email`

- **Seed Data**  
  Skonfigurowano automatyczne dodawanie startowych danych przy inicjalizacji bazy (np. `Orlen`, `Budimex`).

- **`DataController`**  
  Zastąpiono sztuczne dane w kodzie realnym połączeniem z bazą danych przy użyciu **Entity Framework Core**.

---

### 2. Nowy Moduł: Generator PDF (Frontend)

- **Data Binding (Wiązanie danych)**  
  Zaimplementowano mechanizm automatycznego wstrzykiwania danych z bazy do szablonu PDF na podstawie kluczy
- **Obsługa `@pdfme/generator`**  
Dodano bibliotekę umożliwiającą generowanie finalnych plików **PDF bezpośrednio w przeglądarce użytkownika**.

- **Ręczne Uwagi (`extraNotes`)**  
Dodano pole `textarea`, które pozwala użytkownikowi dopisać własne notatki.  
Treść jest również automatycznie dodawana do generowanego raportu PDF.

---

### 3. Ulepszony Interfejs (UX)

- **System Zakładek (Tabs)**  
Aplikacja została podzielona na dwie główne sekcje:

- **PROJEKTOWANIE**  
  Panel dla administratora do tworzenia i edycji szablonów PDF.

- **GENEROWANIE**  
  Panel dla użytkownika do:
  - wybierania szablonu
  - wypełniania danych
  - generowania i pobierania pliku PDF.

- **Automatyczne Odświeżanie**  
Po zapisaniu nowego szablonu lista w generatorze aktualizuje się automatycznie **bez przeładowywania strony**.

---

### 4. Poprawki Techniczne

- **Synchronizacja Typów**  
Naprawiono różnice w konwencjach nazewnictwa między `.NET` a `React`:
- `camelCase`
- `PascalCase`

- **Stabilizacja `pdfme`**  
Wyeliminowano błąd `Invalid argument` poprzez:
- zastosowanie bazowego pliku **Blank PDF**
- usunięcie `StrictMode`, który powodował podwójne renderowanie edytora.

- **Optymalizacja API**
- dodano obsługę błędów JSON
- wprowadzono zabezpieczenia na wypadek pustej bazy danych