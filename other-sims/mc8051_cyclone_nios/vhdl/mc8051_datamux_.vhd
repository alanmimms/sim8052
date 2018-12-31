library IEEE; 
use IEEE.std_logic_1164.all; 
use IEEE.std_logic_arith.all; 
  
-----------------------------ENTITY DECLARATION--------------------------------

entity mc8051_datamux is

  port (clk         :  in std_logic;
        rom_data_i  :  in  std_logic_vector(7 downto 0);       
        pram_data_i :  in  std_logic_vector(7 downto 0);
	select_i    :  in  std_logic;

        prog_data_o :  out std_logic_vector(7 downto 0));

end mc8051_datamux;
