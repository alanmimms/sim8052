This is a JavaScript emulator for the MCS8052 microcontroller from
Intel. This chip was used in many projects in the 1980s and 1990s. The
architecture is still going strong for some applications and there are
many clones and variations still available. It's a simple core with
simple peripherals with a bunch of available software. Getting the
software and tools to build it can be a bit of an Internet
archaeological dig, but that has its own rewards if you're nostalgic
or want to learn how things Used to Be when computers were less
ubiquitous and much more mysterious.

I wrote this simulator to help me learn JavaScript and, honestly, to
play. As a result of this, it's really a toy. But it emulates the 8052
instruction set pretty well, has support for serial console, some
support for a few other Special Function Registers (SFRs), and it
includes a powerful and extensible built-in command line debugger
similar to the one I built for my (now pretty much defunct and
unfinished) PDP-10 simulator.

To run it, install Node (I use v14.x) and do either `yarn update` or
`npm update` to install the required modules. Then you can just `./sim
BASIC2` to run a revised and improved version of the very complete
BASIC Intel included in their mask-ROM version of the chip called
BASIC52.

You can also run `./sim TB51` to run Tiny Basic 51, which is a
charmingly tiny and limited integer-only BASIC but is still pretty
powerful for embedded sorts of code.

Source code and listing files and Intel hex files for these are
already present in the project. The `doc` subdirectory has a lot of
useful background material, some of which may still be claimed as
copyrighted by their respective owners. I include it here as it is
publicly availables in various places and it seems consensus is that
the owners of the copyrights no longer care how far their words and
diagrams are dipersed.

I also include a simple opcode chart I made and a JavaScript program
that created the basis from which I built it.

