"use client";

import Image from "next/image";
import React from "react";
import { AggregateStats } from "../types/aggregateApiResponse";
import { RevaluateTeamApiResponse } from "../types/modelApiResponse";
import { useMatchData } from "../contexts/matchDataContext";

function giveColorClass(value: number) {
  if (value > 0) {
    return "text-green-500";
  }
  if (value < 0) {
    return "text-red-500";
  }
  return "text-gray-500";
}

function giveArrowComparison(hoverPlayerStats: AggregateStats | null, value: number) {
  if (!hoverPlayerStats) return null;

  if (value === Infinity || value === -Infinity || isNaN(value)) return null;

  if (value === 0) {
    return "0%";
  }
  return value > 0 ? `${value} ${String.fromCharCode(8593)}` : `${value * -1} ${String.fromCharCode(8595)}`;
}

function giveArrowComparisonForHover(teamStats: RevaluateTeamApiResponse | null | undefined, value: number) {
  if (!teamStats) return <span className="text-gray-500">HOVER TO VIEW</span>;

  if (value === 0) {
    return "0%";
  }
  return value > 0 ? `${value}% ${String.fromCharCode(8593)}` : `${value * -1}% ${String.fromCharCode(8595)}`;
}

interface PlayerInformationSwapProps {
  playerName: string;
  playerInfo?: AggregateStats;
  teamStats?: RevaluateTeamApiResponse;
  newTeamStats?: RevaluateTeamApiResponse | null;
  hoverPlayerStats: AggregateStats | null;
  selectedPlayersTeamA?: string[];
  selectedPlayersTeamB?: string[];
  hoverPlayer: string;
}

interface PlayerData {
  id: number;
  name: string;
  image: string;
}

function getPlayerImagePath(
  playerName: string,
  selectedPlayersTeamA: PlayerData[],
  selectedPlayersTeamB: PlayerData[]
): string {
  const nameParts = playerName.split(" ");
  const lastName = nameParts[nameParts.length - 1];
  const firstInitial = nameParts[0][0];
  const allPlayers = [...selectedPlayersTeamA, ...selectedPlayersTeamB];

  let matchingPlayer = allPlayers.find((player) => {
    const playerNameParts = player.name.split(" ");
    const playerLastName = playerNameParts[playerNameParts.length - 1];
    const playerFirstInitial = player.name[0];

    return playerLastName === lastName && playerFirstInitial === firstInitial;
  });

  if (!matchingPlayer) {
    matchingPlayer = allPlayers.find((player) => {
      const playerNameParts = player.name.split(" ");
      const playerLastName = playerNameParts[playerNameParts.length - 1];
      return playerLastName === lastName;
    });
  }

  return matchingPlayer ? matchingPlayer.image : "default_player_image_url";
}

function PlayerInformationSwap({
  playerName,
  playerInfo,
  teamStats,
  newTeamStats,
  hoverPlayerStats,
  selectedPlayersTeamA,
  selectedPlayersTeamB,
  hoverPlayer,
}: PlayerInformationSwapProps) {
  const { totalScore, playerStats } = useMatchData();

  const formatName = (name: string) => {
    if (name.length > 13) {
      const words = name.split(" ");
      if (words.length > 1) {
        const initial = words[0][0] + ".";
        return initial + " " + words.slice(1).join(" ");
      }
    }
    return name;
  };

  let newConsistencyScorePercent: number = 0,
    newDiversityScorePercent: number = 0,
    newFormScorePercent: number = 0;

  if (newTeamStats && teamStats) {
    newConsistencyScorePercent =
      ((newTeamStats.team_consistency_score - teamStats.team_consistency_score) * 100) /
      teamStats?.team_consistency_score;

    newDiversityScorePercent =
      ((Math.pow(newTeamStats.team_diversity_score, 1) - Math.pow(teamStats.team_diversity_score, 1)) * 100) /
      Math.pow(teamStats?.team_diversity_score, 1);

    newFormScorePercent = ((newTeamStats.form_score - teamStats.form_score) * 100) / teamStats?.form_score;

    newConsistencyScorePercent = Number(newConsistencyScorePercent.toFixed(2));
    newDiversityScorePercent = Number(newDiversityScorePercent.toFixed(2));
    newFormScorePercent = Number(newFormScorePercent.toFixed(2));
  }

  let runsDiff: number = 0,
    battingSRDiff: number = 0,
    bowlingSRDiff: number = 0,
    economyRateDiff: number = 0,
    totalScoreDiff: number = 0;

  if (hoverPlayerStats) {
    runsDiff = hoverPlayerStats.Runs - playerInfo?.Runs;
    battingSRDiff = hoverPlayerStats["Batting S/R"] - playerInfo?.["Batting S/R"];
    bowlingSRDiff = hoverPlayerStats["Bowling S/R"] - playerInfo?.["Bowling S/R"];
    economyRateDiff = hoverPlayerStats["Economy Rate"] - playerInfo?.["Economy Rate"];

    let totalScoreHoverPlayer = 0;
    let totalScoreSelectedPlayer = 0;

    for (let i = 0; i < playerStats.length; i++) {
      if (playerStats[i].player === hoverPlayer) {
        totalScoreHoverPlayer = playerStats[i].mean_points;
      }
      if (playerStats[i].player === playerName) {
        totalScoreSelectedPlayer = playerStats[i].mean_points;
      }
    }

    totalScoreDiff = totalScoreHoverPlayer - totalScoreSelectedPlayer;

    runsDiff = Number(runsDiff.toFixed(0));
    battingSRDiff = Number(battingSRDiff.toFixed(1));
    bowlingSRDiff = Number(bowlingSRDiff.toFixed(1));
    economyRateDiff = Number(economyRateDiff.toFixed(1));
    totalScoreDiff = Number(totalScoreDiff.toFixed(2));
  }

  return (
    <div className="flex flex-col justify-center items-center uppercase w-[21rem] h-full">
      <h1 className="uppercase text-dream11FontColor font-bold text-3xl mb-4 ">Swap Player</h1>
      <div className="rounded-full border-2 profilePhoto w-44 h-44 mb-8 flex items-center justify-center">
        <Image
          src={getPlayerImagePath(playerName, selectedPlayersTeamA, selectedPlayersTeamB)}
          alt="player"
          height={180}
          width={180}
        />
      </div>
      <div className="flex align-center justify-center">
        <div className="text-left flex flex-col">
          <div className="flex flex-col w-[25rem] ml-24">
            <div className="flex text-dream11FontColor">
              <div className="font-bold w-2/6">Name:</div>
            </div>
            <div className="flex mb-2 text-white">
              <div className="w-2/6">{formatName(playerName)}</div>
            </div>
            <div className="flex text-dream11FontColor">
              <div className="font-bold w-2/6">Batting S/R:</div>
              <div className="font-bold w-4/6">Team Consistency Score:</div>
            </div>
            <div className="flex mb-2 text-white">
              <div className="w-2/6">
                <span>
                  {playerInfo?.["Batting S/R"] < 0 || playerInfo?.["Batting S/R"] === "Infinity"
                    ? "-"
                    : playerInfo?.["Batting S/R"]}
                </span>
                {playerInfo?.["Batting S/R"] < 0 ||
                playerInfo?.["Batting S/R"] === "Infinity" ||
                battingSRDiff === "Infinity" ||
                Number.isNaN(battingSRDiff) ? null : (
                  <span className={`${giveColorClass(battingSRDiff)} ml-4`}>
                    {giveArrowComparison(hoverPlayerStats, battingSRDiff)}
                  </span>
                )}
              </div>
              <div className="w-4/6">
                <span className={`${giveColorClass(newConsistencyScorePercent)}`}>
                  {giveArrowComparisonForHover(newTeamStats, newConsistencyScorePercent)}
                </span>
              </div>
            </div>
            <div className="flex text-dream11FontColor">
              <div className="font-bold w-2/6">Bowling S/R:</div>
              <div className="font-bold w-4/6">Team Diversity Score:</div>
            </div>
            <div className="flex mb-2 text-white">
              <div className="w-2/6">
                <span>
                  {playerInfo?.["Bowling S/R"] < 0 || playerInfo?.["Bowling S/R"] === "Infinity"
                    ? "-"
                    : playerInfo?.["Bowling S/R"]}
                </span>
                {playerInfo?.["Bowling S/R"] < 0 ||
                playerInfo?.["Bowling S/R"] === "Infinity" ||
                bowlingSRDiff === "Infinity" ||
                Number.isNaN(bowlingSRDiff) ? null : (
                  <span className={`${giveColorClass(bowlingSRDiff)} ml-4`}>
                    {giveArrowComparison(hoverPlayerStats, bowlingSRDiff)}
                  </span>
                )}
              </div>
              <div className="w-4/6">
                <span className={`${giveColorClass(newDiversityScorePercent)}`}>
                  {giveArrowComparisonForHover(newTeamStats, newDiversityScorePercent)}
                </span>
              </div>
            </div>
            <div className="flex text-dream11FontColor">
              <div className="font-bold w-2/6">Economy Rate:</div>
              <div className="font-bold w-4/6">Team Form Score:</div>
            </div>
            <div className="flex text-white">
              <div className="w-2/6">
                <span>
                  {playerInfo?.["Economy Rate"] < 0 || playerInfo?.["Economy Rate"] === "Infinity"
                    ? "-"
                    : playerInfo?.["Economy Rate"]}
                </span>
                {playerInfo?.["Economy Rate"] < 0 ||
                playerInfo?.["Economy Rate"] === "Infinity" ||
                economyRateDiff === "Infinity" ||
                Number.isNaN(economyRateDiff) ? null : (
                  <span className={`${giveColorClass(economyRateDiff)} ml-4`}>
                    {giveArrowComparison(hoverPlayerStats, economyRateDiff)}
                  </span>
                )}
              </div>
              <div className="w-4/6">
                <span className={`${giveColorClass(newFormScorePercent)}`}>
                  {giveArrowComparisonForHover(newTeamStats, newFormScorePercent)}
                </span>
              </div>
            </div>
            <div className="flex text-dream11FontColor">
              <div className="font-bold w-2/6">Runs:</div>
              <div className="font-bold w-4/6">Team Score:</div>
            </div>
            <div className="flex text-white">
              <div className="w-2/6">
                <span>{playerInfo?.Runs < 0 || playerInfo?.Runs === "Infinity" ? "-" : playerInfo?.Runs}</span>

                {playerInfo?.Runs < 0 ||
                playerInfo?.Runs === "Infinity" ||
                runsDiff === "Infinity" ||
                Number.isNaN(runsDiff) ? null : (
                  <span className={`${giveColorClass(runsDiff)} ml-4`}>
                    {giveArrowComparison(hoverPlayerStats, runsDiff)}
                  </span>
                )}
              </div>
              <div className="w-4/6">
                <span>{totalScore.toFixed(2)}</span>
                <span className={`${giveColorClass(totalScoreDiff)} ml-4`}>
                  {giveArrowComparison(hoverPlayerStats, totalScoreDiff)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerInformationSwap;
