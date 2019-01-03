# tb51intl/TB51.LST
## PRNTOS decimal algorithm

    function PRNTOS(unsigned short tos):
        unsigned char tmp0 = 0
        unsigned char tmpa = 0
        //
        for 16 iterations:
            tos = rlc(tos)
            a = tmp0
            tmp0 = tmp0 + tmp0 + carry
            decimaladjust(tmp0)
            tmpa = tmpa + tmpa + carry
            decimaladjust(tmpa)
        //
        tos.h = tmpa
        nibout(rlc(tos.l))
