architecture rtl of mc8051_clockdiv is

  signal s_clk    : std_logic;
  signal s_reset  : std_logic;
  signal s_count  : std_logic_vector(1 downto 0);

begin  -- rtl

  s_clk <= clk;
  s_reset <= reset;
  clkdiv <= s_count(1);
  
  p_divide: process (clk, reset)
  begin  
    if s_reset = '1' then  		-- asynchronous reset (active high)
      s_count <= (others => '0');
    elsif s_clk'event and s_clk = '1' then  -- rising clock edge
      s_count <= unsigned(s_count) + conv_unsigned(1,1);
    end if;
  end process p_divide;
  
end rtl;
