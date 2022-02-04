#include <cstddef>
#include <cstdlib>
#include <cxxabi.h>



extern "C" char* RDTY_RENDERERS_WEB_AUX_malloc (const size_t size)
{
  return new char [size];
}

extern "C" void RDTY_RENDERERS_WEB_AUX_free (char* addr)
{
  delete[] addr;
}

extern "C" const char* RDTY_RENDERERS_WEB_AUX_demangleCxxName (char* mangled_name)
{
  int status {};
  char* realname { abi::__cxa_demangle(mangled_name, 0, 0, &status) };
  const char* _realname { realname };
  free(realname);

  return _realname;
}
