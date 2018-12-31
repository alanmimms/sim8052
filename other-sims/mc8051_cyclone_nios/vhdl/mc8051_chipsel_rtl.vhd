architecture rtl of mc8051_chipsel is

  signal s_rom_en   : std_logic; 
  signal s_pram_en  : std_logic; 
  signal s_ramx_en  : std_logic; 

begin  -- rtl

  rom_en_o <= s_rom_en;
  pram_en_o <= s_pram_en;
  ramx_en_o <= s_ramx_en;

  s_rom_en  <= (not rom_adr_i(15)) and (not rom_adr_i(14)) and (not rom_adr_i(13));
  s_pram_en <= ((not rom_adr_i(15)) and (not rom_adr_i(14)) and rom_adr_i(13)) or
               ((not ramx_adr_i(15)) and (not ramx_adr_i(14)) and ramx_adr_i(13));

--  s_ramx_en <= (not adr_i(15)) and adr_i(14) and (not adr_i(13));
  s_ramx_en <= (not ramx_adr_i(15)) and (not ramx_adr_i(14)) and (not ramx_adr_i(13));
   
end rtl;
