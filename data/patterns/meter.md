---
title: "Meter Pattern"
id: "meter"
patternDocUrl: "https://www.w3.org/WAI/ARIA/apg/patterns/meter/"
---

# Meter Pattern

## About This Pattern

A [meter](#meter) is a graphical display of a numeric value that varies within a defined range. For example, a meter could be used to depict a device's current battery percentage or a car's fuel level.

### Note

*   A `meter` should not be used to represent a value like the current world population since it does not have a meaningful maximum limit.
*   The `meter` should not be used to indicate progress, such as loading or percent completion of a task. To communicate progress, use the [progressbar](#progressbar) role instead.

![](../../images/pattern-meter.svg)

## Example

[Meter Example](examples/meter.html)

## Keyboard Interaction

Not applicable.

## WAI-ARIA Roles, States, and Properties

*   The element serving as the meter has a role of [meter](#meter).
*   The meter has [aria-valuenow](#aria-valuenow) set to a decimal value between `aria-valuemin` and `aria-valuemax` representing the current value of the meter.
*   The meter has [aria-valuemin](#aria-valuemin) set to a decimal value less than `aria-valuemax`.
*   The meter has [aria-valuemax](#aria-valuemax) set to a decimal value greater than `aria-valuemin`.
*   Assistive technologies often present `aria-valuenow` as a percentage. If conveying the value of the meter only in terms of a percentage would not be user friendly, the [aria-valuetext](#aria-valuetext) property is set to a string that makes the meter value understandable. For example, a battery meter value might be conveyed as `aria-valuetext="50% (6 hours) remaining"`.
*   If the meter has a visible label, it is referenced by [aria-labelledby](#aria-labelledby) on the element with role `meter`. Otherwise, the element with role `meter` has a label provided by [aria-label](#aria-label).
