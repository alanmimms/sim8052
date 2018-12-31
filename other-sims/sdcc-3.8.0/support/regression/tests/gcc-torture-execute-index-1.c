/*
index-1.c from the execute part of the gcc torture tests.
*/

#include <testfwk.h>

int a[] =
{
  0,  1,  2,  3,  4,  5,  6,  7,  8,  9,
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39
};

int
f (long n)
{
  return a[n - 100000];
}

void
testTortureExecute (void)
{
  if (f (100030L) != 30)
    ASSERT(0);
  return;
}
