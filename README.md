This is a JavaScript emulator for the MCS8052 microcontroller from
Intel. It was first used in many projects in the 1980s and 1990s. The
architecture is still going strong for some applications. It's a
simple core with simple peripherals and there is a bunch of software
out there for it.

I wrote this to help me learn JavaScript and to play. It's really a
toy. But it emulates the 8052 instruction set pretty well, has support
for serial console, some support for a few other Special Function
Registers (SFRs), and it includes a pretty useful built-in command
line debugger similar to the one I built for my (now pretty much
defunct and unfinished) PDP10 simulator.

To run it, install Node (I use v14.x) and do either `yarn update` or
`npm update` to install the required modules. Then you can just `./sim
BASIC2` to run a revised and improved version of the very complete
BASIC Intel included in their mask-ROM version of the chip called
BASIC52. You can also run `./sim TB51` to run Tiny Basic 51, which is
charmingly tiny and limited but still pretty powerful. Source code and
listing files and Intel hex files for these are already present in the
project.
