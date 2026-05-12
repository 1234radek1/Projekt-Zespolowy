FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["RaportApp/RaportApp.csproj", "RaportApp/"]
RUN dotnet restore "RaportApp/RaportApp.csproj"

COPY . .
WORKDIR "/src/RaportApp"
RUN dotnet publish "RaportApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Ustawiamy port 5000, aby podłączyć się z wygenerowanym URL we Frontendzie
ENV ASPNETCORE_HTTP_PORTS=5000

ENTRYPOINT ["dotnet", "RaportApp.dll"]
