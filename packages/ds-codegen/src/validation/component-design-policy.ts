import type { ComponentContract } from '../contract.js';
import type { ValidationIssue } from '../validate.js';
import { componentTokenRenames } from '../component-token-naming.js';
import { missingDesignBindings } from '../design-properties.js';

export function validateComponentDesignPolicy(contract: ComponentContract): ValidationIssue[] {
  const issues = missingDesignBindings(contract).map(pointer => ({ pointer,
    message: '[DESIGN_BINDING_MISSING] Common Web design decision needs an independent property binding.' }));
  try {
    for (const [slot, neutral] of Object.entries(componentTokenRenames(contract))) {
      issues.push({ pointer: `/tokens/${slot}`,
        message: `[COMPONENT_TOKEN_NAME] ${slot} has no state sibling; use ${neutral}.` });
    }
  } catch (error) {
    issues.push({ pointer: '/tokens', message: `[COMPONENT_TOKEN_NAME] ${String(error)}` });
  }
  return issues;
}
