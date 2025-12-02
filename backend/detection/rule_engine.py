"""
Detection Rule Engine
Enterprise-grade rule evaluation with safe DSL interpreter
Zero eval/exec - explicit AST parsing only
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Callable
import operator
import ast


@dataclass
class Rule:
    """Detection rule definition"""
    name: str
    description: str
    severity: str
    action: str
    condition: str
    metadata: Dict[str, Any]
    enabled: bool = True
    ttl_seconds: int | None = None


# Safe function registry - whitelisted functions only
FUNCS: Dict[str, Callable] = {
    "jaccard_distance": lambda a, b: 1 - (len(set(a) & set(b)) / (len(set(a) | set(b)) or 1)),
    "in_set": lambda x, s: x in set(s),
    "not_in_set": lambda x, s: x not in set(s),
    "len": lambda x: len(x),
    "abs": abs,
    "min": min,
    "max": max,
}


class SafeEvaluator(ast.NodeVisitor):
    """
    Safe AST-based expression evaluator
    No eval/exec - only whitelisted operations
    """
    
    allowed_binops = (ast.And, ast.Or)
    allowed_ops = (ast.Gt, ast.GtE, ast.Lt, ast.LtE, ast.Eq, ast.NotEq)
    
    def __init__(self, context: Dict[str, Any]):
        self.context = context
        self.stack = []
    
    def visit_Module(self, node):
        """Entry point"""
        return self.visit(node.body[0].value)
    
    def visit_BoolOp(self, node):
        """Handle AND/OR operations"""
        vals = [self.visit(v) for v in node.values]
        if isinstance(node.op, ast.And):
            return all(vals)
        if isinstance(node.op, ast.Or):
            return any(vals)
        raise ValueError(f"Boolean operation not allowed: {type(node.op).__name__}")
    
    def visit_Compare(self, node):
        """Handle comparison operations"""
        left = self.visit(node.left)
        rights = [self.visit(c) for c in node.comparators]
        op = node.ops[0]
        
        OPS = {
            ast.Gt: operator.gt,
            ast.GtE: operator.ge,
            ast.Lt: operator.lt,
            ast.LtE: operator.le,
            ast.Eq: operator.eq,
            ast.NotEq: operator.ne,
        }
        
        if type(op) not in OPS:
            raise ValueError(f"Comparison operator not allowed: {type(op).__name__}")
        
        return OPS[type(op)](left, rights[0])
    
    def visit_Call(self, node):
        """Handle function calls - whitelisted only"""
        func_name = node.func.id if isinstance(node.func, ast.Name) else None
        
        if not func_name or func_name not in FUNCS:
            raise ValueError(f"Function not allowed: {func_name}")
        
        fn = FUNCS[func_name]
        args = [self.visit(a) for a in node.args]
        
        return fn(*args)
    
    def visit_Name(self, node):
        """Handle variable access - context only"""
        if node.id not in self.context:
            raise ValueError(f"Unknown variable: {node.id}")
        return self.context[node.id]
    
    def visit_Constant(self, node):
        """Handle constants"""
        return node.value
    
    def visit_List(self, node):
        """Handle list literals"""
        return [self.visit(e) for e in node.elts]
    
    def visit_Set(self, node):
        """Handle set literals"""
        return set(self.visit(e) for e in node.elts)
    
    def visit_BinOp(self, node):
        """Handle binary operations - only set difference allowed"""
        if isinstance(node.op, ast.Sub):
            left = self.visit(node.left)
            right = self.visit(node.right)
            return set(left) - set(right)
        
        raise ValueError(f"Binary operation not allowed: {type(node.op).__name__}")


def eval_condition(expr: str, ctx: Dict[str, Any]) -> bool:
    """
    Safely evaluate rule condition expression
    
    Supported operations:
    - Boolean: and, or
    - Comparison: >, >=, <, <=, ==, !=
    - Functions: jaccard_distance, in_set, not_in_set, len, abs, min, max
    - Set operations: - (difference)
    
    Args:
        expr: Condition expression string
        ctx: Event context dictionary
        
    Returns:
        Boolean result of evaluation
        
    Raises:
        ValueError: If expression contains disallowed operations
        SyntaxError: If expression is malformed
    """
    try:
        tree = ast.parse(expr, mode='eval')
        evaluator = SafeEvaluator(ctx)
        result = evaluator.visit(tree)
        return bool(result)
    except Exception as e:
        # Log error for monitoring
        raise ValueError(f"Rule evaluation failed: {str(e)}")


def evaluate_rules(event: Dict[str, Any], rules: List[Rule]) -> List[Dict[str, Any]]:
    """
    Evaluate all rules against an event
    
    Args:
        event: Event data dictionary
        rules: List of rules to evaluate
        
    Returns:
        List of rule matches with metadata
    """
    hits = []
    
    for rule in rules:
        # Skip disabled rules
        if not rule.enabled:
            continue
        
        try:
            # Evaluate rule condition
            if eval_condition(rule.condition, event):
                hit = {
                    "rule": rule.name,
                    "description": rule.description,
                    "severity": rule.severity,
                    "action": rule.action,
                    "metadata": rule.metadata,
                }
                
                # Add TTL if specified
                if rule.ttl_seconds:
                    hit["ttl_seconds"] = rule.ttl_seconds
                
                hits.append(hit)
                
        except Exception as e:
            # Emit rule error metric
            # Don't fail entire evaluation due to one bad rule
            print(f"Rule evaluation error [{rule.name}]: {str(e)}")
            continue
    
    return hits


def load_rules_from_yaml(yaml_path: str) -> List[Rule]:
    """
    Load and validate rules from YAML file
    
    Args:
        yaml_path: Path to YAML rules file
        
    Returns:
        List of validated Rule objects
    """
    import yaml
    
    with open(yaml_path, 'r') as f:
        rules_data = yaml.safe_load(f)
    
    rules = []
    for rule_data in rules_data:
        rule = Rule(
            name=rule_data['name'],
            description=rule_data['description'],
            severity=rule_data['severity'],
            action=rule_data['action'],
            condition=rule_data['condition'],
            metadata=rule_data['metadata'],
            enabled=rule_data.get('enabled', True),
            ttl_seconds=rule_data.get('ttl_seconds'),
        )
        rules.append(rule)
    
    return rules
