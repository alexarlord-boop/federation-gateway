"""
OpenAPI Specification Parser

Parses the OpenAPI YAML specification to automatically discover:
- Available endpoints and operations
- Feature groupings (based on tags)
- Operation permissions for RBAC

This eliminates hardcoding and makes the system truly backend-agnostic.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Set, Optional
from collections import defaultdict


class OpenAPIParser:
    """Parse OpenAPI specification to extract capabilities and permissions"""
    
    def __init__(self, spec_path: str):
        """
        Initialize parser with OpenAPI spec file path
        
        Args:
            spec_path: Path to OpenAPI YAML specification file
        """
        self.spec_path = Path(spec_path)
        self.spec = self._load_spec()
        
    def _load_spec(self) -> dict:
        """Load and parse the OpenAPI YAML file"""
        with open(self.spec_path, 'r') as f:
            return yaml.safe_load(f)
    
    def get_features(self) -> Dict[str, dict]:
        """
        Extract features from OpenAPI spec.
        
        Groups endpoints by their primary tag to create feature definitions.
        
        Returns:
            Dict mapping feature names to their configuration:
            {
                "subordinates": {
                    "operations": ["list", "create", "view", "update", "delete"],
                    "endpoints": ["GET /api/v1/admin/subordinates", ...],
                    "description": "Management of subordinate entities",
                    "tag": "Subordinates"
                }
            }
        """
        features = defaultdict(lambda: {
            "operations": set(),
            "endpoints": [],
            "description": "",
            "tag": ""
        })
        
        # Parse paths
        for path, path_item in self.spec.get('paths', {}).items():
            for method, operation in path_item.items():
                if method.upper() not in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']:
                    continue
                
                # Get primary tag (feature grouping)
                tags = operation.get('tags', [])
                if not tags:
                    continue
                    
                primary_tag = tags[0]
                
                # Normalize tag to feature name (lowercase, underscore-separated)
                feature_name = primary_tag.lower().replace(' ', '_').replace('-', '_')
                
                # Skip system/auth endpoints from feature extraction
                if feature_name in ['system', 'auth', 'authentication', 'health']:
                    continue
                
                # Determine operation type from method and path
                operation_type = self._determine_operation_type(method.upper(), path, operation)
                
                # Build feature data
                features[feature_name]["operations"].add(operation_type)
                features[feature_name]["endpoints"].append(f"{method.upper()} {path}")
                features[feature_name]["tag"] = primary_tag
                
                # Use operation summary or tag description
                if not features[feature_name]["description"] and operation.get('summary'):
                    features[feature_name]["description"] = operation.get('summary')
        
        # Convert sets to sorted lists
        result = {}
        for feature_name, feature_data in features.items():
            result[feature_name] = {
                "operations": sorted(list(feature_data["operations"])),
                "endpoints": feature_data["endpoints"],
                "description": feature_data["description"],
                "tag": feature_data["tag"],
                "openapi_path": self._extract_base_path(feature_data["endpoints"])
            }
        
        return result
    
    def _determine_operation_type(self, method: str, path: str, operation: dict) -> str:
        """
        Determine the semantic operation type from HTTP method and path.
        
        Examples:
            GET /api/v1/subordinates -> "list"
            GET /api/v1/subordinates/{id} -> "view"
            POST /api/v1/subordinates -> "create"
            PATCH /api/v1/subordinates/{id} -> "update"
            DELETE /api/v1/subordinates/{id} -> "delete"
            POST /api/v1/subordinates/{id}/approve -> "approve"
        """
        has_id_param = '{id}' in path or '{kid}' in path or '{entity_id}' in path
        
        # Check operation ID for semantic meaning
        operation_id = operation.get('operationId', '').lower()
        
        # Special operations (from path suffixes)
        if '/approve' in path:
            return 'approve'
        if '/revoke' in path:
            return 'revoke'
        if '/issue' in path:
            return 'issue'
        if '/rotate' in path:
            return 'rotate'
        if '/validate' in path:
            return 'validate'
        if '/publish' in path:
            return 'publish'
        if '/discover' in path:
            return 'discover'
        if '/refresh' in path:
            return 'refresh'
        
        # Standard CRUD operations
        if method == 'GET':
            return 'view' if has_id_param else 'list'
        elif method == 'POST':
            return 'create' if not has_id_param else 'action'
        elif method in ['PUT', 'PATCH']:
            return 'update'
        elif method == 'DELETE':
            return 'delete'
        
        return 'action'
    
    def _extract_base_path(self, endpoints: List[str]) -> str:
        """
        Extract the common base path from a list of endpoints.
        
        Example:
            ["GET /api/v1/admin/subordinates", "POST /api/v1/admin/subordinates"] 
            -> "/api/v1/admin/subordinates"
        """
        if not endpoints:
            return ""
        
        # Extract paths (remove HTTP method)
        paths = [ep.split(' ', 1)[1] for ep in endpoints if ' ' in ep]
        if not paths:
            return ""
        
        # Find shortest path (likely the base)
        base = min(paths, key=len)
        
        # Remove path parameters
        if '{' in base:
            base = base.split('/{')[0]
        
        return base
    
    def get_all_operations(self) -> Set[str]:
        """
        Get all unique operation types across the entire spec.
        
        Returns:
            Set of operation types like {"list", "view", "create", "update", "delete", ...}
        """
        operations = set()
        features = self.get_features()
        
        for feature_data in features.values():
            operations.update(feature_data["operations"])
        
        return operations
    
    def get_api_info(self) -> dict:
        """
        Extract API metadata from OpenAPI spec.
        
        Returns:
            Dict with title, version, description
        """
        info = self.spec.get('info', {})
        return {
            "title": info.get('title', 'Unknown API'),
            "version": info.get('version', '0.0.0'),
            "description": info.get('description', ''),
        }


def parse_openapi_spec(spec_path: str = None) -> OpenAPIParser:
    """
    Convenience function to parse OpenAPI spec.
    
    Args:
        spec_path: Path to OpenAPI YAML file. If None, uses default location.
        
    Returns:
        OpenAPIParser instance
    """
    if spec_path is None:
        # Try Docker location first, then project root
        docker_spec = Path("/app/Federation_Admin_OpenAPI.yaml")
        if docker_spec.exists():
            spec_path = docker_spec
        else:
            # Development: project root
            base_dir = Path(__file__).resolve().parents[3]
            spec_path = base_dir / "Federation Admin OpenAPI.yaml"
    
    return OpenAPIParser(spec_path)
