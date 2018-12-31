library IEEE; 
use IEEE.std_logic_1164.all; 
use IEEE.std_logic_arith.all; 
  
-----------------------------ENTITY DECLARATION--------------------------------

entity mc8051_chipsel is

  port (ramx_adr_i  :  in  std_logic_vector(15 downto 0);       
        rom_adr_i   :  in  std_logic_vector(15 downto 0);

        rom_en_o    :  out std_logic;
        pram_en_o   :  out std_logic;
        ramx_en_o   :  out std_logic);

end mc8051_chipsel;
