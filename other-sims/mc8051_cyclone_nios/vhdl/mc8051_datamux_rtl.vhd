architecture rtl of mc8051_datamux is

  signal s_select     : std_logic;
  signal s_rom_data   : std_logic_vector(7 downto 0); 
  signal s_pram_data  : std_logic_vector(7 downto 0); 
  signal s_prog_data  : std_logic_vector(7 downto 0); 

begin  -- rtl

  s_rom_data <= rom_data_i;
  s_pram_data <= pram_data_i;
  s_select <= select_i;
  prog_data_o <= s_prog_data;
  
  p_mux: process (clk) --s_select, s_rom_data, s_pram_data)
    begin
     if (clk='0' and clk'event) then
       if (s_select = '1') then
         s_prog_data <= s_rom_data;
       else
         s_prog_data <= s_pram_data;
       end if;
     end if;
    end process p_mux;
  
--  s_prog_data <= s_rom_data when (s_select = '1') else s_pram_data;
   
end rtl;
