import streamlit as st
import openai
import json
import os
from dotenv import load_dotenv
import plotly.graph_objects as go
import datetime
import re
import numpy as np
import scipy.stats as stats
# from heuristic_solver import compute_player_stats, compute_covariance_matrix, optimize_team_advanced
import pandas as pd

def extract_date_from_match_key(match_key):
  date_pattern = r'(\d{4}-\d{2}-\d{2})'
  match = re.search(date_pattern, match_key)
  if match:
      return match.group(1)
  else:
      return None
  


def get_past_match_performance(player_name, fantasy_points, num_matches=50, key='total_points', date_of_match=None):
    """
    Retrieves and processes historical match performance data for a player.
    If fewer matches than requested are available, extends using cyclic repetition of available matches.
    
    Args:
        player_name (str): Name of the player
        fantasy_points (dict): Historical fantasy points data
        num_matches (int): Number of past matches to consider
        key (str): Key for points data in match info
        date_of_match (str): Date to filter matches before (YYYY-MM-DD format)
    
    Returns:
        tuple: Lists of match identifiers and corresponding points.
              If N matches requested but M < N available (M > 0),
              returns matches in cyclic pattern until N matches are filled.
              If no matches available, returns lists filled with 'No Match' and 0.
    """
    # Get player data
    player_data = fantasy_points.get(player_name)
    if not player_data:
        return ['No Match'] * num_matches, [0] * num_matches

    # Convert to list of matches
    matches_data = list(player_data.items()) if isinstance(player_data, dict) else player_data

    # Filter and sort by date if specified
    if date_of_match:
        try:
            date_of_match_dt = datetime.datetime.strptime(date_of_match, '%Y-%m-%d')
            filtered_player_data = []
            for match_data in matches_data:
                match_key = match_data[0] if isinstance(match_data, tuple) else match_data
                date_match = re.search(r'\d{4}-\d{2}-\d{2}', str(match_key))
                if date_match:
                    match_date = datetime.datetime.strptime(date_match.group(), '%Y-%m-%d')
                    if match_date < date_of_match_dt:
                        filtered_player_data.append((match_date, match_data))
            
            # Sort by date and remove date from tuple, keeping only match data
            filtered_player_data.sort(key=lambda x: x[0])
            filtered_player_data = [x[1] for x in filtered_player_data]
            # print(filtered_player_data)
        except ValueError:
            return ['No Match'] * num_matches, [0] * num_matches
    else:
        filtered_player_data = matches_data

    # Return zeros if no matches available
    if not filtered_player_data:
        return ['No Match'] * num_matches, [0] * num_matches

    # Process available matches
    available_matches, available_points = [], []
    for match_data in filtered_player_data:
        if isinstance(match_data, tuple):
            match_key, match_info = match_data
            available_matches.append(match_key)
            available_points.append(match_info.get(key, 0))
        else:
            available_matches.append(match_data[0])
            available_points.append(match_data[1].get(key, 0))

    # If we have fewer matches than requested, implement cyclic repetition
    # print(available_matches)
    available_matches.reverse()
    if available_matches:
        num_available = len(available_matches)
        final_matches = []
        final_points = []
        
        # Fill up to num_matches using cyclic repetition
        for i in range(num_matches):
            idx = i % num_available
            final_matches.append(available_matches[idx])
            final_points.append(available_points[idx])
        # print(final_matches)
        return final_matches, final_points
    
    return ['No Match'] * num_matches, [0] * num_matches

def plot_team_distribution(mu, sigma, actual_score, optimal_score):
    """
    Creates a Plotly visualization of team score distribution with key metrics.
    
    Args:
        mu (float): Mean of the distribution
        sigma (float): Standard deviation of the distribution
        actual_score (float): Actual team score
        optimal_score (float): Optimal team score
    
    Returns:
        plotly.graph_objects.Figure: Interactive plot of score distribution
    """
    x = np.linspace(mu - 4*sigma, mu + 4*sigma, 1000)
    y = stats.norm.pdf(x, mu, sigma)
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines', name='Expected Distribution',
        line=dict(color='blue', width=2),
        fill='tozeroy', fillcolor='rgba(0, 0, 255, 0.1)'
    ))
    
    fig.add_vline(x=actual_score, line_dash="dash", line_color="red",
                 annotation_text=f"Actual Score: {actual_score:.1f}",
                 annotation_position="top right", annotation=dict(yshift=10))
    
    fig.add_vline(x=optimal_score, line_dash="dash", line_color="green",
                 annotation_text=f"Optimal Score: {optimal_score:.1f}",
                 annotation_position="bottom right", annotation=dict(yshift=-10))
    
    fig.add_vline(x=mu, line_dash="dot", line_color="gray",
                 annotation_text=f"Expected Score: {mu:.1f}",
                 annotation_position="top left", annotation=dict(yshift=20))
    
    fig.update_layout(
        title="Team Score Distribution",
        xaxis_title="Total Points",
        yaxis_title="Probability Density",
        showlegend=True,
        template="plotly_white",
        height=400,
        margin=dict(t=50, l=50, r=50, b=50)
    )
    
    return fig

# def calculate_team_metrics(stats_df, weights_df, cov_matrix, quantile_form =75):
#     """
#     Calculates comprehensive performance metrics for a selected team.
    
#     Args:
#         stats_df (pd.DataFrame): Player statistics including mean_points and variance
#         weights_df (pd.DataFrame): Selected players with weight=1 for selected
#         cov_matrix (np.array): Covariance matrix of player performances
    
#     Returns:
#         dict: Dictionary containing:
#             - trend_score: Expected total points
#             - consistency_score: Average Sharpe ratio
#             - diversity_score: Entropy of point distribution
#             - form_score: Number of top performers
#     """
#     try:
#         selected_players = weights_df[weights_df['weight'] == 1]['player'].tolist()
#         if not selected_players:
#             raise ValueError("No players selected in weights_df")
            
#         selected_df = stats_df[stats_df['player'].isin(selected_players)].copy()
#         if selected_df.empty:
#             raise ValueError("No stats found for selected players")

#         trend_score = selected_df['mean_points'].sum()
#         consistency_score = (selected_df['mean_points'] / np.sqrt(selected_df['variance'])).mean()
        
#         if selected_df['mean_points'].sum() > 0:
#             point_shares = selected_df['mean_points'] / selected_df['mean_points'].sum()
#             diversity_score = -(np.sum(point_shares * np.log(point_shares + 1e-10)))/11
#         else:
#             diversity_score = 0

#         points_q = stats_df['mean_points'].quantile(quantile_form/100)
#         top_performers = selected_df[selected_df['mean_points'] >= points_q]
#         form_score = len(top_performers)

#         return {
#             'trend_score': round(trend_score, 2),
#             'consistency_score': round(consistency_score, 2),
#             'diversity_score': round(diversity_score, 2),
#             'form_score': round(form_score, 2)
#         }
        
#     except Exception as e:
#         print(f"Error calculating team metrics: {str(e)}")
#         return {
#             'trend_score': 0,
#             'consistency_score': 0,
#             'diversity_score': 0,
#             'form_score': 0
#         }


def calculate_team_metrics(stats_df, weights_df, cov_matrix, quantile_form=75):
    """
    Calculates comprehensive performance metrics for a selected team.
    
    Args:
        stats_df (pd.DataFrame): Player statistics including mean_points and variance
        weights_df (pd.DataFrame): Selected players with weight=1 for selected
        cov_matrix (np.array): Covariance matrix of player performances
        quantile_form (float): Percentile threshold for form calculation
    
    Returns:
        dict: Dictionary containing:
            - trend_score: Total expected points
            - consistency_score: Linear consistency score (0-100)
            - diversity_score: Linear diversity score (0-100)
            - form_score: Number of players above form threshold
    """
    try:
        selected_players = weights_df[weights_df['weight'] == 1]['player'].tolist()
        if not selected_players:
            raise ValueError("No players selected in weights_df")
            
        selected_df = stats_df[stats_df['player'].isin(selected_players)].copy()
        if selected_df.empty:
            raise ValueError("No stats found for selected players")

        # Trend Score: Total expected points
        trend_score = selected_df['mean_points'].sum()

        # Linear Consistency Score (0-100)
        # Use coefficient of variation (CV) for each player
        cvs = np.sqrt(selected_df['variance']) / selected_df['mean_points'].clip(lower=1e-10)
        # Transform CVs to 0-100 scale where lower CV = higher consistency
        max_acceptable_cv = 1.0  # Define max acceptable CV
        consistency_scores = (100 * (1 - cvs.clip(upper=max_acceptable_cv)/max_acceptable_cv))
        consistency_score = consistency_scores.mean()
        
        # Linear Diversity Score (0-100)
        if trend_score > 0:
            point_shares = selected_df['mean_points'] / trend_score
            # Calculate how far each share is from ideal equal share
            ideal_share = 1.0 / len(selected_players)
            share_deviations = np.abs(point_shares - ideal_share)
            # Convert to 0-100 score where 100 means perfectly equal distribution
            max_deviation = ideal_share  # Maximum possible deviation from ideal
            diversity_score = 100 * (1 - np.mean(share_deviations) / max_deviation)
        else:
            diversity_score = 0

        # Form Score: Count of high performers
        points_threshold = stats_df['mean_points'].quantile(quantile_form/100)
        form_score = len(selected_df[selected_df['mean_points'] >= points_threshold])

        return {
            'trend_score': round(trend_score, 2),
            'consistency_score': round(consistency_score, 2),
            'diversity_score': round(diversity_score, 2),
            'form_score': round(form_score, 2)
        }
        
    except Exception as e:
        print(f"Error calculating team metrics: {str(e)}")
        return {
            'trend_score': 0,
            'consistency_score': 0,
            'diversity_score': 0,
            'form_score': 0
        }
def load_player_fantasy_points(json_file):
    """
    Loads and sorts player fantasy points data from a JSON file.
    
    Args:
        json_file (str): Path to JSON file containing player data
    
    Returns:
        dict: Sorted player fantasy points data
    """
    with open(json_file, "r") as file:
        data = json.load(file)
        sorted_data = {}
        for player, matches in data.items():
            match_list = list(matches.items())
            match_list_sorted = sorted(
                match_list,
                key=lambda x: datetime.datetime.strptime(
                    re.search(r'(\d{4}-\d{2}-\d{2})', x[0]).group(1),
                    '%Y-%m-%d'
                ) if re.search(r'(\d{4}-\d{2}-\d{2})', x[0]) else datetime.datetime.min
            )
            sorted_data[player] = match_list_sorted
        return sorted_data

# Initialize OpenAI client
load_dotenv()
KEY = os.getenv('OPENAI_KEY')
client = openai.OpenAI(api_key=KEY)