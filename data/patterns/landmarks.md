---
title: "Landmarks Pattern"
id: "landmarks"
patternDocUrl: "https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/"
---

# Landmarks Pattern

## About This Pattern

[Landmarks](#landmark) are a set of eight roles that identify the major sections of a page. Each landmark role enables assistive technology users to perceive the start and end of a feature of the high-level page structure that is usually conveyed visually with placement, spacing, color, or borders. For example, the [main](#main) landmark designates the section that contains the main content of the page. In addition to conveying structure, landmarks enable browsers and assistive technologies to facilitate efficient keyboard navigation among sections of a page.

Several landmark roles are implied by HTML elements. For example, the HTML `main` element automatically creates a main landmark region, and the HTML `nav` element creates a navigation landmark region.

Since landmarks are intended to help assistive technology users perceive the high-level structure of a page, their value diminishes as their number grows. For optimum value, a general rule of thumb is that a page contains seven or fewer landmark regions. Another best practice is to ensure that all content is contained within an appropriate landmark region. The [Landmark Regions Practice](../../practices//landmark-regions//landmark-regions-practice.html) describes ways of using HTML sectioning elements and ARIA landmark roles that will most benefit users.

![](../../images/pattern-landmarks.svg)

## Examples

*   [Main Landmark Example](examples/main.html)
*   [Navigation Landmark Example](examples/navigation.html)
*   [Search Landmark Example](examples/search.html)
*   [Banner Landmark Example](examples/banner.html)
*   [Contentinfo Landmark Example](examples/contentinfo.html)
*   [Complementary Landmark Example](examples/complementary.html)
*   [Form Landmark Example](examples/form.html)
*   [Region Landmark Example](examples/region.html)

## Keyboard Interaction

Not applicable.

## WAI-ARIA Roles, States, and Properties

The [Landmark Regions Practice](../../practices//landmark-regions//landmark-regions-practice.html) describes the HTML elements, roles, properties, and usage guidelines for each of the landmark region roles.
