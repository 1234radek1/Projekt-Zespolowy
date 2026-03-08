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

# Instrukcja uruchomienia 

## 1. Wymagania systemowe

- **Node.js** (wersja 18+)
- **.NET 8 SDK**
- **PostgreSQL**

---

## 2. Konfiguracja Bazy Danych

1. Otwórz **pgAdmin 4** (lub inne narzędzie SQL).
2. Stwórz nową bazę danych o nazwie:

```
PdfReportsDb
```

3. Przejdź do pliku:

```
RaportApp/RaportApp/appsettings.json
```

4. W sekcji `ConnectionStrings` wpisz swoje hasło do PostgreSQL:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=PdfReportsDb;Username=postgres;Password=TWOJE_HASLO"
```

---

## 3. Uruchomienie Backend-u (.NET)

1. Otwórz rozwiązanie w **Visual Studio** (`.slnx` lub `.sln` w folderze `RaportApp`).

2. Otwórz **Package Manager Console** i wpisz:

```powershell
Update-Database
```

(To stworzy niezbędne tabele w Twojej bazie danych).

3. Uruchom projekt (`F5`).

API powinno wystartować na porcie:

```
http://localhost:5000
```

---

## 4. Uruchomienie Frontendu (React)

1. Otwórz terminal w folderze:

```
raport-frontend
```

2. Zainstaluj biblioteki:

```bash
npm install
```

3. Uruchom aplikację:

```bash
npm run dev
```

4. Otwórz adres wskazany w terminalu (prawdopodobnie):

```
http://localhost:5173
```

lub

```
http://localhost:5174
```

---

# Uwagi do rozwoju

- Szablony są zapisywane jako obiekty **JSON** w kolumnie `SchemaContent`.
- Obecnie edytor startuje z **pustą stroną A4**.
- Porty są ustawione na:
  - Backend → `5000`
  - Frontend → `5174`

Jeśli React uruchomi się na innym porcie, pamiętaj o sprawdzeniu ustawień **CORS w `Program.cs`**.

---
