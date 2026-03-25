---
title: "Table Pattern"
id: "table"
patternDocUrl: "https://www.w3.org/WAI/ARIA/apg/patterns/table/"
---

# Table Pattern

## About This Pattern

Like an HTML `table` element, a WAI-ARIA [table](#table) is a static tabular structure containing one or more rows that each contain one or more cells; it is not an interactive widget. Thus, its cells are not focusable or selectable. The [grid pattern](../grid/grid-pattern.html) is used to make an interactive widget that has a tabular structure.

However, tables are often used to present a combination of information and interactive widgets. Since a table is not a widget, each widget contained in a table is a separate stop in the page tab sequence. If the number of widgets is large, replacing the table with a grid can dramatically reduce the length of the page tab sequence because a grid is a composite widget that can contain other widgets.

### Note

As with other WAI-ARIA roles that have a native host language equivalent, authors are strongly encouraged to use a native HTML `table` element whenever possible. This is especially important with role `table` because it is a new feature of WAI-ARIA 1.1. It is thus advisable to test implementations thoroughly with each browser and assistive technology combination that could be used by the target audience.

![](../../images/pattern-table.svg)

## Examples

*   [Table Example](examples/table.html): ARIA table made using HTML `div` and `span` elements.
*   [Sortable Table Example](examples/sortable-table.html): Basic HTML table that illustrates implementation of `aria-sort` in the headers of sortable columns.

## Keyboard Interaction

Not applicable.

## WAI-ARIA Roles, States, and Properties

*   The table container has role [table](#table).
*   Each row container has role [row](#row) and is either a DOM descendant of or owned by the `table` element or an element with role [rowgroup](#rowgroup).
*   Each cell is either a DOM descendant of or owned by a `row` element and has one of the following roles:
    *   [columnheader](#columnheader) if the cell contains a title or header information for the column.
    *   [rowheader](#rowheader) if the cell contains title or header information for the row.
    *   [cell](#cell) if the cell does not contain column or row header information.
*   If there is an element in the user interface that serves as a label for the table, [aria-labelledby](#aria-labelledby) is set on the table element with a value that refers to the labelling element. Otherwise, a label is specified for the table element using [aria-label](#aria-label).
*   If the table has a caption or description, [aria-describedby](#aria-describedby) is set on the table element with a value referring to the element containing the description.
*   If the table contains sortable columns or rows, [aria-sort](#aria-sort) is set to an appropriate value on the header cell element for the sorted column or row as described in the [Grid and Table Properties Practice](../../practices/grid-and-table-properties/grid-and-table-properties-practice.html#gridAndTableProperties_sort).
*   If there are conditions where some rows or columns are hidden or not present in the DOM, e.g., there are widgets on the page for hiding rows or columns, the following properties are applied as described in the [Grid and Table Properties Practice](../../practices/grid-and-table-properties/grid-and-table-properties-practice.html).
    *   [aria-colcount](#aria-colcount) or [aria-rowcount](#aria-rowcount) is set to the total number of columns or rows, respectively.
    *   [aria-colindex](#aria-colindex) or [aria-rowindex](#aria-rowindex) is set to the position of a cell within a row or column, respectively.
*   If the table includes cells that span multiple rows or multiple columns, then [aria-rowspan](#aria-rowspan) or [aria-colspan](#aria-colspan) is applied as described in the [Grid and Table Properties Practice](../../practices/grid-and-table-properties/grid-and-table-properties-practice.html#gridAndTableProperties_spans).

### Note

If rows or cells are included in a table via [aria-owns](#aria-owns), they will be presented to assistive technologies after the DOM descendants of the `table` element unless the DOM descendants are also included in the `aria-owns` attribute.
