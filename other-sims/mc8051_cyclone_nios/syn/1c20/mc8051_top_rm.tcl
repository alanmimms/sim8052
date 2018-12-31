if {[cmp get_assignment_value "" "" "" ROOT] != ""} {
  cmp remove_assignment "" "" "" ROOT ""
}
if {[cmp get_assignment_value "" "" "" FAMILY] !=  ""} {
  cmp remove_assignment "" "" "" FAMILY ""
}
if {[cmp get_assignment_value "mc8051_top" "" "" DEVICE] !=  ""} {
  cmp remove_assignment "mc8051_top" "" "" DEVICE ""
}
if {[project get_assignment_value "" "|cyclonepll:i_cyclonepll|s_clk_pll_setting" "" "" "DUTY_CYCLE"] != ""} {
  project remove_assignment "" "|cyclonepll:i_cyclonepll|s_clk_pll_setting" "" "" "DUTY_CYCLE" ""
}
if {[project get_assignment_value "mc8051_top" "" "" "|cyclonepll:i_cyclonepll|s_clk_pll" "GLOBAL_SIGNAL"] !=  ""} {
  project remove_assignment "mc8051_top" "" "" "|cyclonepll:i_cyclonepll|s_clk_pll" "GLOBAL_SIGNAL" ""
}
if {[project get_assignment_value "mc8051_top" "" "" "|cyclonepll:i_cyclonepll|s_clk_pll" "USE_CLOCK_SETTINGS"] != ""} {
  project remove_assignment "mc8051_top" "" "" "|cyclonepll:i_cyclonepll|s_clk_pll" "USE_CLOCK_SETTINGS" ""
}
if {[project get_assignment_value "" "|cyclonepll:i_cyclonepll|s_clk_pll_setting" "" "" "FMAX_REQUIREMENT"] != ""} {
  project remove_assignment "" "|cyclonepll:i_cyclonepll|s_clk_pll_setting" "" "" "FMAX_REQUIREMENT" ""
}
if {[project get_assignment_value "" "clk_setting" "" "" "DUTY_CYCLE"] != ""} {
  project remove_assignment "" "clk_setting" "" "" "DUTY_CYCLE" ""
}
if {[project get_assignment_value "mc8051_top" "" "" "clk" "GLOBAL_SIGNAL"] !=  ""} {
  project remove_assignment "mc8051_top" "" "" "clk" "GLOBAL_SIGNAL" ""
}
if {[project get_assignment_value "mc8051_top" "" "" "clk" "USE_CLOCK_SETTINGS"] != ""} {
  project remove_assignment "mc8051_top" "" "" "clk" "USE_CLOCK_SETTINGS" ""
}
if {[project get_assignment_value "" "clk_setting" "" "" "FMAX_REQUIREMENT"] != ""} {
  project remove_assignment "" "clk_setting" "" "" "FMAX_REQUIREMENT" ""
}
if {[project get_assignment_value "" "" "" "TAO_FILE" "myresults.tao"] != ""} {
  project remove_assignment "" "" "" "TAO_FILE" "myresults.tao" ""
}
if {[project get_assignment_value "" "" "" "SOURCES_PER_DESTINATION_INCLUDE_COUNT" "1000"] != ""} {
  project remove_assignment "" "" "" "SOURCES_PER_DESTINATION_INCLUDE_COUNT" "1000" ""
}
if {[project get_assignment_value "" "" "" "ROUTER_REGISTER_DUPLICATION" "ON"] != ""} {
  project remove_assignment "" "" "" "ROUTER_REGISTER_DUPLICATION" "ON" ""
}
