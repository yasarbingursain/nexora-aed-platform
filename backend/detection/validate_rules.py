#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Detection Rule Validator
Validates detection rule YAML files against schema for CI/CD integration
"""

import os
import sys
import yaml
import re
import jsonschema
from pathlib import Path
from typing import List, Tuple

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_schema(schema_path: Path) -> dict:
    """Load JSON schema from YAML file"""
    with open(schema_path, 'r') as f:
        return yaml.safe_load(f)


def validate_rule_file(rule_file: Path, schema: dict) -> Tuple[bool, List[str]]:
    """
    Validate a single rule file against schema
    
    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []
    
    try:
        with open(rule_file, 'r') as f:
            rules = yaml.safe_load(f)
        
        # Validate against schema
        try:
            jsonschema.validate(rules, schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Schema validation failed: {e.message}")
            errors.append(f"  Path: {' -> '.join(str(p) for p in e.path)}")
            return False, errors
        
        # Additional semantic validation
        for idx, rule in enumerate(rules):
            rule_name = rule.get('name', f'rule_{idx}')
            
            # Validate condition syntax
            try:
                import ast
                ast.parse(rule['condition'], mode='eval')
            except SyntaxError as e:
                errors.append(f"Rule '{rule_name}': Invalid condition syntax: {e}")
            
            # Validate MITRE ATT&CK IDs format
            for technique_id in rule['metadata'].get('mitre_attack', []):
                if not technique_id.startswith('T') or not technique_id[1:5].isdigit():
                    errors.append(f"Rule '{rule_name}': Invalid MITRE ATT&CK ID: {technique_id}")
            
            # Validate severity levels
            valid_severities = ['low', 'medium', 'high', 'critical']
            if rule['severity'] not in valid_severities:
                errors.append(f"Rule '{rule_name}': Invalid severity: {rule['severity']}")
            
            # Validate actions
            valid_actions = ['allow', 'deny', 'step_up_auth', 'rotate_immediately', 'quarantine', 'notify']
            if rule['action'] not in valid_actions:
                errors.append(f"Rule '{rule_name}': Invalid action: {rule['action']}")
        
        return len(errors) == 0, errors
        
    except yaml.YAMLError as e:
        errors.append(f"YAML parsing error: {e}")
        return False, errors
    except Exception as e:
        errors.append(f"Unexpected error: {e}")
        return False, errors


def main():
    """Main validation entry point"""
    base_dir = Path(__file__).parent
    schema_path = base_dir / 'rules' / 'schema.yaml'
    rules_dir = base_dir / 'rules'
    
    # Load schema
    try:
        schema = load_schema(schema_path)
        print(f"✓ Loaded schema from {schema_path}")
    except Exception as e:
        print(f"✗ Failed to load schema: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Find all rule files
    rule_files = list(rules_dir.glob('*.yaml'))
    rule_files = [f for f in rule_files if f.name != 'schema.yaml']
    
    if not rule_files:
        print("⚠ No rule files found to validate")
        sys.exit(0)
    
    print(f"\nValidating {len(rule_files)} rule file(s)...\n")
    
    # Validate each file
    all_valid = True
    for rule_file in rule_files:
        is_valid, errors = validate_rule_file(rule_file, schema)
        
        if is_valid:
            print(f"✓ {rule_file.name}")
        else:
            print(f"✗ {rule_file.name}")
            for error in errors:
                print(f"  {error}")
            all_valid = False
    
    # Summary
    print()
    if all_valid:
        print("✓ All rule files are valid")
        sys.exit(0)
    else:
        print("✗ Validation failed - fix errors above", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
