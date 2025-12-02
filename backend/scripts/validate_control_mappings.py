#!/usr/bin/env python3
"""
Control Mapping Validator
Validates compliance control mapping YAML files against schema
For CI/CD integration
"""

import os
import sys
import yaml
import json
import jsonschema
from pathlib import Path
from typing import List, Tuple

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_schema(schema_path: Path) -> dict:
    """Load JSON schema"""
    with open(schema_path, 'r') as f:
        return json.load(f)


def validate_mapping_file(mapping_file: Path, schema: dict) -> Tuple[bool, List[str]]:
    """
    Validate a single control mapping file against schema
    Returns (is_valid, errors)
    """
    errors = []
    
    # Load YAML
    try:
        with open(mapping_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        return False, [f"YAML syntax error: {e}"]
    except Exception as e:
        return False, [f"Failed to load file: {e}"]
    
    # Validate against schema
    try:
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.ValidationError as e:
        errors.append(f"Schema validation failed: {e.message}")
        return False, errors
    
    # Additional semantic validation
    
    # Check detection rule format
    for control in data.get('nexora_controls', []):
        rule_id = control.get('detection_rule', '')
        if not rule_id:
            errors.append("Missing detection_rule")
            continue
        
        # Rule ID should be like "NHI-001"
        if not rule_id.split('-')[0].isupper() or not rule_id.split('-')[-1].isdigit():
            errors.append(f"Invalid detection_rule format: {rule_id} (expected: PREFIX-NNN)")
    
    # Check MITRE ATT&CK IDs
    for control in data.get('nexora_controls', []):
        mappings = control.get('mappings', {})
        mitre_ids = mappings.get('mitre_attack', [])
        for mitre_id in mitre_ids:
            if not mitre_id.startswith('T') or not mitre_id[1:5].isdigit():
                errors.append(f"Invalid MITRE ATT&CK ID: {mitre_id} (expected: Txxxx or Txxxx.xxx)")
    
    # Check evidence locations
    valid_prefixes = ['s3://', 'db://', 'dashboard://', 'file://']
    for loc in data.get('evidence_locations', []):
        if not any(loc.startswith(prefix) for prefix in valid_prefixes):
            errors.append(f"Invalid evidence location: {loc} (must start with {', '.join(valid_prefixes)})")
    
    # Check owner emails
    owners = data.get('owners', {})
    for owner_type in ['control_owner', 'evidence_owner', 'technical_owner']:
        email = owners.get(owner_type)
        if email and '@' not in email:
            errors.append(f"Invalid email for {owner_type}: {email}")
    
    return len(errors) == 0, errors


def main():
    """Main validation routine"""
    # Find schema
    script_dir = Path(__file__).parent.parent
    schema_path = script_dir / 'compliance' / 'schemas' / 'control_mapping.schema.json'
    
    if not schema_path.exists():
        print(f"✗ Schema not found: {schema_path}")
        return 1
    
    print(f"✓ Loaded schema from {schema_path}")
    schema = load_schema(schema_path)
    
    # Find all mapping files
    mappings_dir = script_dir / 'compliance' / 'mappings'
    if not mappings_dir.exists():
        print(f"✗ Mappings directory not found: {mappings_dir}")
        return 1
    
    mapping_files = list(mappings_dir.glob('*.yaml')) + list(mappings_dir.glob('*.yml'))
    
    if not mapping_files:
        print(f"✗ No mapping files found in {mappings_dir}")
        return 1
    
    print(f"\nValidating {len(mapping_files)} mapping file(s)...\n")
    
    # Validate each file
    all_valid = True
    for mapping_file in sorted(mapping_files):
        is_valid, errors = validate_mapping_file(mapping_file, schema)
        
        if is_valid:
            print(f"✓ {mapping_file.name}")
        else:
            print(f"✗ {mapping_file.name}")
            for error in errors:
                print(f"  - {error}")
            all_valid = False
    
    # Summary
    print()
    if all_valid:
        print("✓ All control mapping files are valid")
        return 0
    else:
        print("✗ Some control mapping files have errors")
        return 1


if __name__ == "__main__":
    sys.exit(main())
