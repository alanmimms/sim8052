library IEEE; 
use IEEE.std_logic_1164.all; 
use IEEE.std_logic_arith.all; 
  
-----------------------------ENTITY DECLARATION--------------------------------

entity mc8051_clockdiv is

  port (clk    :  in  std_logic;
	reset  :  in  std_logic;
        clkdiv :  out std_logic);       

end mc8051_clockdiv;
