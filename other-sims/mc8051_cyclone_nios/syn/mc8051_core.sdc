# Synplicity, Inc. constraint file
# N:\design\mc8051\synpl\mc8051_core.sdc
# Written on Wed Oct 13 17:22:19 2004
# by Synplify Pro, 7.6.1      Scope Editor

#
# Clocks
#
define_clock            -name {clk}  -freq 60.000 -clockgroup default_clkgroup_0

#
# Clock to Clock
#

#
# Inputs/Outputs
#
define_input_delay -disable      -default -improve 0.00 -route 0.00
define_output_delay -disable     -default -improve 0.00 -route 0.00
define_input_delay -disable      {all_rxd_i[0]} -improve 0.00 -route 0.00
define_output_delay -disable     {all_rxd_o[0]} -improve 0.00 -route 0.00
define_output_delay -disable     {all_rxdwr_o[0]} -improve 0.00 -route 0.00
define_input_delay -disable      {all_t0_i[0]} -improve 0.00 -route 0.00
define_input_delay -disable      {all_t1_i[0]} -improve 0.00 -route 0.00
define_output_delay -disable     {all_txd_o[0]} -improve 0.00 -route 0.00
define_input_delay -disable      {clk} -improve 0.00 -route 0.00
define_input_delay -disable      {int0_i[0]} -improve 0.00 -route 0.00
define_input_delay -disable      {int1_i[0]} -improve 0.00 -route 0.00
define_input_delay -disable      {p0_i[7:0]} -improve 0.00 -route 0.00
define_output_delay -disable     {p0_o[7:0]} -improve 0.00 -route 0.00
define_input_delay -disable      {p1_i[7:0]} -improve 0.00 -route 0.00
define_output_delay -disable     {p1_o[7:0]} -improve 0.00 -route 0.00
define_input_delay -disable      {p2_i[7:0]} -improve 0.00 -route 0.00
define_output_delay -disable     {p2_o[7:0]} -improve 0.00 -route 0.00
define_input_delay -disable      {p3_i[7:0]} -improve 0.00 -route 0.00
define_output_delay -disable     {p3_o[7:0]} -improve 0.00 -route 0.00
define_input_delay -disable      {reset_n} -improve 0.00 -route 0.00

#
# Registers
#

#
# Multicycle Path
#

#
# False Path
#

#
# Delay Path
#

#
# Attributes
#

#
# Compile Points
#

#
# Other Constraints
#
