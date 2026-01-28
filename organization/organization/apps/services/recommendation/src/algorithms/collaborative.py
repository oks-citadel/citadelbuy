"""
Collaborative Filtering Algorithm
User-based and item-based collaborative filtering for recommendations
"""

import numpy as np
from typing import List, Dict, Optional
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class CollaborativeFilter:
    """
    Collaborative filtering recommendation engine.
    Uses user behavior patterns to make recommendations.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None

    def load_model(self):
        """Load pre-trained collaborative filtering model."""
        if self.model_path:
            # Load from saved model
            pass
        logger.info("Collaborative filter model loaded")

    def build_user_item_matrix(self, interactions: List[Dict]) -> np.ndarray:
        """
        Build user-item interaction matrix from user interactions.

        Args:
            interactions: List of {user_id, product_id, rating/interaction_type}

        Returns:
            User-item matrix as numpy array
        """
        # Extract unique users and items
        users = list(set(i['user_id'] for i in interactions))
        items = list(set(i['product_id'] for i in interactions))

        user_idx = {u: i for i, u in enumerate(users)}
        item_idx = {p: i for i, p in enumerate(items)}

        # Create sparse matrix
        matrix = np.zeros((len(users), len(items)))

        for interaction in interactions:
            u_idx = user_idx[interaction['user_id']]
            i_idx = item_idx[interaction['product_id']]
            # Weight by interaction type
            weight = self._get_interaction_weight(interaction.get('type', 'view'))
            matrix[u_idx, i_idx] = max(matrix[u_idx, i_idx], weight)

        self.user_item_matrix = matrix
        self.user_idx = user_idx
        self.item_idx = item_idx
        self.idx_to_item = {v: k for k, v in item_idx.items()}

        return matrix

    def _get_interaction_weight(self, interaction_type: str) -> float:
        """Get weight for different interaction types."""
        weights = {
            'view': 1.0,
            'click': 2.0,
            'add_to_cart': 3.0,
            'purchase': 5.0,
            'review': 4.0,
            'wishlist': 2.5
        }
        return weights.get(interaction_type, 1.0)

    def compute_user_similarity(self) -> np.ndarray:
        """Compute user-user similarity matrix using cosine similarity."""
        if self.user_item_matrix is None:
            raise ValueError("User-item matrix not built")

        self.user_similarity_matrix = cosine_similarity(self.user_item_matrix)
        return self.user_similarity_matrix

    def compute_item_similarity(self) -> np.ndarray:
        """Compute item-item similarity matrix using cosine similarity."""
        if self.user_item_matrix is None:
            raise ValueError("User-item matrix not built")

        self.item_similarity_matrix = cosine_similarity(self.user_item_matrix.T)
        return self.item_similarity_matrix

    def recommend(
        self,
        user_id: str,
        product_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
        method: str = "user_based"
    ) -> List[Dict]:
        """
        Generate recommendations using collaborative filtering.

        Args:
            user_id: Target user ID
            product_id: Optional product for similar item recommendations
            category: Optional category filter
            limit: Number of recommendations
            method: 'user_based' or 'item_based'

        Returns:
            List of recommended products with scores
        """
        if method == "user_based":
            return self._user_based_recommendations(user_id, limit)
        else:
            return self._item_based_recommendations(user_id, limit)

    def _user_based_recommendations(self, user_id: str, limit: int) -> List[Dict]:
        """User-based collaborative filtering."""
        if user_id not in self.user_idx:
            # Cold start - return popular items
            return self._get_popular_items(limit)

        user_index = self.user_idx[user_id]
        user_vector = self.user_item_matrix[user_index]

        # Find similar users
        similarities = self.user_similarity_matrix[user_index]
        similar_users = np.argsort(similarities)[::-1][1:11]  # Top 10 similar users

        # Aggregate items from similar users
        scores = np.zeros(self.user_item_matrix.shape[1])
        for sim_user in similar_users:
            weight = similarities[sim_user]
            scores += weight * self.user_item_matrix[sim_user]

        # Remove already interacted items
        scores[user_vector > 0] = -np.inf

        # Get top recommendations
        top_indices = np.argsort(scores)[::-1][:limit]

        recommendations = []
        for idx in top_indices:
            if scores[idx] > 0:
                recommendations.append({
                    'product_id': self.idx_to_item[idx],
                    'score': float(scores[idx]),
                    'reason': 'Users similar to you liked this',
                    'category': 'collaborative'
                })

        return recommendations

    def _item_based_recommendations(self, user_id: str, limit: int) -> List[Dict]:
        """Item-based collaborative filtering."""
        if user_id not in self.user_idx:
            return self._get_popular_items(limit)

        user_index = self.user_idx[user_id]
        user_vector = self.user_item_matrix[user_index]

        # Find items user has interacted with
        interacted_items = np.where(user_vector > 0)[0]

        # Find similar items
        scores = np.zeros(self.user_item_matrix.shape[1])
        for item_idx in interacted_items:
            weight = user_vector[item_idx]
            scores += weight * self.item_similarity_matrix[item_idx]

        # Remove already interacted items
        scores[interacted_items] = -np.inf

        # Get top recommendations
        top_indices = np.argsort(scores)[::-1][:limit]

        recommendations = []
        for idx in top_indices:
            if scores[idx] > 0:
                recommendations.append({
                    'product_id': self.idx_to_item[idx],
                    'score': float(scores[idx]),
                    'reason': 'Similar to items you liked',
                    'category': 'collaborative'
                })

        return recommendations

    def _get_popular_items(self, limit: int) -> List[Dict]:
        """Fallback to popular items for cold start users."""
        if self.user_item_matrix is None:
            return []

        popularity = np.sum(self.user_item_matrix, axis=0)
        top_indices = np.argsort(popularity)[::-1][:limit]

        return [
            {
                'product_id': self.idx_to_item[idx],
                'score': float(popularity[idx]),
                'reason': 'Popular item',
                'category': 'popular'
            }
            for idx in top_indices
        ]
