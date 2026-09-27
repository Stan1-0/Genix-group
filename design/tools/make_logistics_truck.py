"""Usage: python design/tools/make_logistics_truck.py

The small truck for the Logistics "How a job runs" road: the logo's mark
(truck + gold G) cut from genix-logistics-logo.svg. The truck body is
lightened so it reads on navy; the gold G is untouched. Mark bbox in logo
units: x 136-622, y 4-170."""
import re
from pathlib import Path

A = Path(__file__).resolve().parent.parent / "assets"
logo = (A / "genix-logistics-logo.svg").read_text(encoding="utf-8")
truck, g = re.findall(r"<path [^>]*/>", logo)[:2]
assert 'fill="#37404A"' in truck and 'fill="#C28A2C"' in g, "logo path order changed: re-check trace_logistics_logo.py"
truck = truck.replace('fill="#37404A"', 'fill="#E6E8EA"')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="136 4 486 166" width="486" height="166">\n  {truck}\n  {g}\n</svg>\n'
(A / "logistics-truck.svg").write_text(svg, encoding="utf-8")
print(f"logistics-truck.svg  {len(svg) / 1024:.1f} KB")
