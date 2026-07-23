import { getStations } from "./irail.service.js";

export async function getDeparturesForQuery(query: string) {
  const stations = await getStations();
  const normalizedQuery = query.toLowerCase();

  const matchedStations = stations
    .filter((station) => {
      const englishName = station.name.toLowerCase();
      const standardName = station.standardname.toLowerCase();

      return (
        englishName.includes(normalizedQuery) ||
        standardName.includes(normalizedQuery)
      );
    })
    .map((station) => ({
      id: station.id,
      name: station.name,
      standardName: station.standardname,
    }))
    .sort((firstStation, secondStation) =>
      firstStation.name.localeCompare(secondStation.name),
    );

  return {
    query,
    matchedStations,
    totalStations: matchedStations.length,
    message:
      "Station matching is implemented. Departure lookup is the next step.",
  };
}
