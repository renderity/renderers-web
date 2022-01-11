/**
 * Using TypedArray.subarray() is preferred
 * when accessing to non-scalar data (like arrays)
 * to avoid extra memory allocation.
 *
 * Strange std::string behavior:
 * if std::string data length <=11, std::string object address is the same with its data;
 * if >11, std::string object name stores address of beginning of the data.
 * So in second case one can use WasmWrapper::Charv method to get string bytes.
 * Maybe it's not related to data length, but to dynamic memory allocation.
 *
 *
 *
 * If memory is shared then memory growing is not allowed
 * and maximum memory size is specified at compilation.
 *
 *
 *
 * Passing argument by reference works as passing by pointer.
 * So, functions with reference parameters expect address instead of value.
 *
 *
 *
 * TODO: determination capabiity of what wasm memory type is being used.
 */



//  import Base from './base';



const _4_BYTES = 4;
const IDLE_FUNCTION = () => 0;



export default class WasmWrapper
{
	// TODO: calculate these dinamically or get statically compiled?
	/* eslint-disable no-magic-numbers */
	static PTR_SIZE = 4;
	static SIZE_T_SIZE = 4;
	static FLOAT_SIZE = 4;
	/* eslint-enable no-magic-numbers */

	static text_decoder = new TextDecoder('utf-8');

	// static uint8Array2DomString (uint8_array)
	// {
	// 	return WasmWrapper.text_decoder.decode(uint8_array);
	// }

	// Version for shared buffer.
	// Decoding views of shared buffer is not allowed.
	static uint8Array2DomString (uint8_array)
	{
		return WasmWrapper.text_decoder.decode(uint8_array.slice());
	}

	constructor ()
	{
		this.memory_views = {};

		this.Uniform = null;
		this.UniformBlock = null;
		this.DescriptorSet = null;
		this.Material = null;
		this.Object = null;
		this.Scene = null;
	}

	Addr (addr)
	{
		return this.memory_views.UI32[addr / WasmWrapper.PTR_SIZE];
	}

	Addrv (addr, length)
	{
		const _addr = addr / WasmWrapper.PTR_SIZE;

		return this.memory_views.UI32.subarray(_addr, _addr + length);
	}

	Uint32 (addr)
	{
		return this.memory_views.UI32[addr / _4_BYTES];
	}

	Uint32v (addr, length)
	{
		const _addr = addr / _4_BYTES;

		return this.memory_views.UI32.subarray(_addr, _addr + length);
	}

	Char (addr)
	{
		return this.memory_views.UI8[addr];
	}

	// TODO: rename to CStringLen?
	CharvLen (addr)
	{
		const _addr = addr;

		for (let vend = 0; ; ++vend)
		{
			if (this.Char(_addr + vend) === 0)
			{
				return vend;
			}
		}
	}

	// TODO: rename to CString?
	Charv (addr)
	{
		return this.memory_views.UI8.subarray
		(addr, addr + this.CharvLen(addr));
	}

	Charv2 (addr, length)
	{
		return this.memory_views.UI8.subarray
		(addr, addr + length);
	}

	SizeT (addr)
	{
		return this.memory_views.UI32[addr / WasmWrapper.SIZE_T_SIZE];
	}

	SizeTv (addr, length)
	{
		const _addr = addr / WasmWrapper.SIZE_T_SIZE;

		return this.memory_views.UI32.subarray(_addr, _addr + length);
	}

	Float (addr)
	{
		return this.memory_views.F32[addr / WasmWrapper.FLOAT_SIZE];
	}

	Floatv (addr, length)
	{
		const _addr = addr / WasmWrapper.FLOAT_SIZE;

		return this.memory_views.F32.subarray(_addr, _addr + length);
	}

	StdString (addr)
	{
		/**
		 * 	These funcions must to be defined:

		 *	extern "C" void* getStdStringData (std::string& s)
		 *	{
		 *		return s.data();
		 *	}
		 *
		 *	extern "C" size_t getStdStringSize (std::string& s)
		 *	{
		 *		return s.size();
		 *	}
		 */

		const _addr = addr;

		const result =
			this.Charv2
			(
				this.exports.getStdStringData(_addr),

				this.exports.getStdStringSize(_addr),
			);

		return result;
	}

	/**
	 * 	These funcions must to be defined:

	 *	extern "C" void* getStdVectorData (std::vector<int>& v)
	 *	{
	 *		return v.data();
	 *	}
	 *
	 *	extern "C" size_t getStdVectorSize (std::vector<int>& v)
	 *	{
	 *		return v.size();
	 *	}
	 */

	StdVectorUint32 (addr)
	{
		const _addr = addr;

		const result =
			this.Uint32v
			(
				this.exports.getStdVectorData(_addr),

				this.exports.getStdVectorSize(_addr),
			);

		return result;
	}

	StdVectorFloat (addr)
	{
		const _addr = addr;

		const result =
			this.Floatv
			(
				this.exports.getStdVectorData(_addr),

				this.exports.getStdVectorSize(_addr),
			);

		return result;
	}

	StdVectorAddr (addr)
	{
		const _addr = addr;

		const result =
			this.Addrv
			(
				this.exports.getStdVectorData(_addr),

				this.exports.getStdVectorSize(_addr),
			);

		return result;
	}

	async init (code, memory, declareRsWrappersClasses = true, custom_imports)
	{
		/* eslint-disable consistent-this */
		const wasm_wrapper = this;

		const wasm_module = await WebAssembly.compile(code);

		LOG(wasm_module);

		// this.module = wasm_module;

		const wasm_module_instance =
			await WebAssembly.instantiate
			// await WebAssembly.instantiateStreaming
			(
				wasm_module,

				{
					env:
						Object.assign
						(
							{
								__memory_base: 0,
								__table_base: 0,
								// memory: this.memory,
								memory,
								// memory: memory ? null : this.memory,

								// sin: Math.sin,
								// cos: Math.cos,
								// tan: Math.tan,

								// memmove (dst, src, len)
								// {
								// 	return (_this.memory_views.UI8.copyWithin(dst, src, src + len), dst);
								// },

								// memcpy (dst, src, len)
								// {
								// 	return (_this.memory_views.UI8.copyWithin(dst, src, src + len), dst);
								// },

								// // rename to memnull
								// zero (dst)
								// {
								// 	_this.memory_views.UI8.set(ZERO_64, dst);
								// },

								// // new
								// // Need to be hardly refined!
								// _Znwm (allocated_byte_count)
								// {
								// 	const result = _this.exports.__heap_base + _this.heap_ptr;

								// 	LOG('new', result, allocated_byte_count, _this.heap_ptr)

								// 	_this.heap_ptr += allocated_byte_count;

								// 	return result;
								// },

								// memset: IDLE_FUNCTION,
								// printf: IDLE_FUNCTION,
								// putchar: IDLE_FUNCTION,

								// _ZdlPv: IDLE_FUNCTION, // delete
								// _ZSt20__throw_length_errorPKc: IDLE_FUNCTION,
								// _ZSt17__throw_bad_allocv: () => LOG('_ZSt17__throw_bad_allocv'),
								// __cxa_atexit: IDLE_FUNCTION,

								__multi3: IDLE_FUNCTION,
								console_log: (x) => LOG('C/C++:', x),
								console_log_f: (x) => LOG('C/C++:', x),
								date_now: () => Date.now(),
							},

							custom_imports,
						),

					// TODO: learn what is wasi_snapshot_preview1.
					wasi_snapshot_preview1:
					{
						fd_seek: IDLE_FUNCTION,
						fd_write: IDLE_FUNCTION,
						fd_close: IDLE_FUNCTION,
						fd_fdstat_get: IDLE_FUNCTION,
						fd_advise: IDLE_FUNCTION,
						fd_allocate: IDLE_FUNCTION,
						fd_datasync: IDLE_FUNCTION,
						fd_fdstat_set_flags: IDLE_FUNCTION,
						fd_fdstat_set_rights: IDLE_FUNCTION,
						fd_filestat_get: IDLE_FUNCTION,
						fd_filestat_set_size: IDLE_FUNCTION,
						fd_filestat_set_times: IDLE_FUNCTION,
						fd_pread: IDLE_FUNCTION,
						fd_prestat_get: IDLE_FUNCTION,
						fd_prestat_dir_name: IDLE_FUNCTION,
						fd_pwrite: IDLE_FUNCTION,
						fd_read: IDLE_FUNCTION,
						fd_readdir: IDLE_FUNCTION,
						fd_renumber: IDLE_FUNCTION,
						fd_sync: IDLE_FUNCTION,
						fd_tell: IDLE_FUNCTION,

						path_create_directory: IDLE_FUNCTION,
						path_filestat_get: IDLE_FUNCTION,
						path_filestat_set_times: IDLE_FUNCTION,
						path_link: IDLE_FUNCTION,
						path_open: IDLE_FUNCTION,
						path_readlink: IDLE_FUNCTION,
						path_remove_directory: IDLE_FUNCTION,
						path_rename: IDLE_FUNCTION,
						path_symlink: IDLE_FUNCTION,
						path_unlink_file: IDLE_FUNCTION,
						poll_oneoff: IDLE_FUNCTION,
						proc_raise: IDLE_FUNCTION,
						sched_yield: IDLE_FUNCTION,
						random_get: IDLE_FUNCTION,
						sock_recv: IDLE_FUNCTION,
						sock_send: IDLE_FUNCTION,
						sock_shutdown: IDLE_FUNCTION,

						proc_exit: IDLE_FUNCTION,

						clock_time_get: IDLE_FUNCTION,

						args_get: IDLE_FUNCTION,
						args_sizes_get: IDLE_FUNCTION,
						environ_get: IDLE_FUNCTION,
						environ_sizes_get: IDLE_FUNCTION,
						clock_res_get: IDLE_FUNCTION,
					},
				},
			);

		LOG(wasm_module_instance);

		this.exports = wasm_module_instance.exports;

		// imported || exported
		const { buffer } = memory || wasm_module_instance.exports.memory;

		this.memory_views.UI8 = new Uint8Array(buffer);
		this.memory_views.I8 = new Int8Array(buffer);
		this.memory_views.UI16 = new Uint16Array(buffer);
		this.memory_views.I16 = new Int16Array(buffer);
		this.memory_views.UI32 = new Uint32Array(buffer);
		this.memory_views.I32 = new Int32Array(buffer);
		this.memory_views.F32 = new Float32Array(buffer);
		this.memory_views.F64 = new Float64Array(buffer);



		if (declareRsWrappersClasses)
		{
			// Slow block. TODO: find better approach.
			const mangled_names =
			{
				renderer_offsets: null,
				uniform_offsets: null,
				uniform_block_offsets: null,
				descriptor_set_offsets: null,
				material_offsets: null,
			};

			{
				const non_mangled_name_list = Object.keys(mangled_names);

				Object.keys(this.exports).forEach
				(
					(name) =>
					{
						for (let i = 0; i < non_mangled_name_list.length; ++i)
						{
							if (name.includes(non_mangled_name_list[i]))
							{
								mangled_names[non_mangled_name_list[i]] = name;

								break;
							}
						}
					},
				);
			}



			class Base
			{
				static instances = null;

				static getInstance (addr, ...args)
				{
					if (!this.instances)
					{
						this.instances = {};
					}

					if (!this.instances[addr])
					{
						Object.defineProperty
						(
							this.instances,

							addr,

							{ value: new this(addr, ...args) },
						);
					}

					return this.instances[addr];
				}

				static getOriginalStruct (addr)
				{
					const original_struct = {};

					let member_index = 0;

					for (const member_name in this.original_struct_descriptor)
					{
						const type = this.original_struct_descriptor[member_name];

						original_struct[member_name] =
							wasm_wrapper[type](addr + this.original_struct_offsets[member_index]);

						++member_index;
					}

					return original_struct;
				}



				constructor (addr)
				{
					this.addr = addr;
				}
			}



			class Renderer extends Base
			{
				static original_struct_descriptor =
					{
						width: 'SizeT',
						height: 'SizeT',
					};

				static original_struct_offsets =
					wasm_wrapper.SizeTv
					(
						// wasm_wrapper.exports._ZN4RDTY8WRAPPERS16renderer_offsetsE,
						wasm_wrapper.exports[mangled_names.renderer_offsets],
						Object.keys(this.original_struct_descriptor).length,
					);



				constructor (addr)
				{
					super(addr);



					this.original_struct = Renderer.getOriginalStruct(this.addr);

					this.width = this.original_struct.width;
					this.height = this.original_struct.height;
				}
			}

			this.Renderer = Renderer;



			class Uniform extends Base
			{
				static original_struct_descriptor =
					{
						object_addr: 'Addr',
						name: 'StdString',
						// TODO: rename to offset
						block_index: 'SizeT',
						size: 'SizeT',
					};

				static original_struct_offsets =
					wasm_wrapper.SizeTv
					(
						// wasm_wrapper.exports._ZN4RDTY8WRAPPERS15uniform_offsetsE,
						wasm_wrapper.exports[mangled_names.uniform_offsets],
						Object.keys(this.original_struct_descriptor).length,
					);



				constructor (addr)
				{
					super(addr);



					this.original_struct = Uniform.getOriginalStruct(this.addr);

					this.object_addr = this.original_struct.object_addr;

					this.name = WasmWrapper.uint8Array2DomString(this.original_struct.name);

					// uniform block index
					this.block_index = this.original_struct.block_index;

					this.size = this.original_struct.size;

					this._data = wasm_wrapper.Charv2(this.object_addr, this.size);
				}
			}

			this.Uniform = Uniform;



			class UniformBlock extends Base
			{
				static original_struct_descriptor =
					{
						binding: 'SizeT',
						type: 'SizeT',
						name: 'StdString',
						uniforms: 'StdVectorAddr',
					};

				static original_struct_offsets =
					wasm_wrapper.SizeTv
					(
						// wasm_wrapper.exports._ZN4RDTY8WRAPPERS21uniform_block_offsetsE,
						wasm_wrapper.exports[mangled_names.uniform_block_offsets],
						Object.keys(this.original_struct_descriptor).length,
					);



				constructor (addr)
				{
					super(addr);



					this.original_struct = UniformBlock.getOriginalStruct(this.addr);

					this.binding = this.original_struct.binding;

					this.type = this.original_struct.type;

					this.name = WasmWrapper.uint8Array2DomString(this.original_struct.name);



					this.uniforms_seq = null;
					this.uniforms_dict = {};

					this.buffer = null;

					this.buffer_length = 0;
				}

				getUniforms (renderer)
				{
					this.uniforms_seq =
						// TypedArray::map returns TypedArray, but need Array.
						Array.from(this.original_struct.uniforms).map
						(
							(uniform_addr) =>
							{
								const uniform = renderer.Uniform.getInstance(uniform_addr);

								this.buffer_length += uniform._data.length;

								this.uniforms_dict[uniform.name] = uniform;

								return uniform;
							},
						);
				}
			}

			this.UniformBlock = UniformBlock;



			class DescriptorSet extends Base
			{
				static original_struct_descriptor =
					{
						bindings: 'StdVectorAddr',
					};

				static original_struct_offsets =
					wasm_wrapper.SizeTv
					(
						// wasm_wrapper.exports._ZN4RDTY8WRAPPERS22descriptor_set_offsetsE,
						wasm_wrapper.exports[mangled_names.descriptor_set_offsets],
						Object.keys(this.original_struct_descriptor).length,
					);



				constructor (addr)
				{
					super(addr);



					this.original_struct = DescriptorSet.getOriginalStruct(this.addr);

					// this.uniform_blocks
				}
			}

			this.DescriptorSet = DescriptorSet;



			class Material extends Base
			{
				static original_struct_descriptor =
					{
						topology: 'SizeT',
						front_face: 'SizeT',
						glsl100es_code_vertex: 'StdString',
						glsl100es_code_fragment: 'StdString',
						glsl300es_code_vertex: 'StdString',
						glsl300es_code_fragment: 'StdString',
						glsl4_code_vertex: 'StdString',
						glsl4_code_fragment: 'StdString',
						glsl_vulkan_code_vertex: 'StdString',
						glsl_vulkan_code_fragment: 'StdString',
						wgsl_code_vertex: 'StdString',
						wgsl_code_fragment: 'StdString',
						spirv_code_vertex: 'StdVectorUint32',
						spirv_code_fragment: 'StdVectorUint32',
						uniforms: 'StdVectorAddr',
						uniform_blocks: 'StdVectorAddr',
						descriptor_sets: 'StdVectorAddr',
					};

				static original_struct_offsets =
					wasm_wrapper.SizeTv
					(
						// wasm_wrapper.exports._ZN4RDTY8WRAPPERS16material_offsetsE,
						wasm_wrapper.exports[mangled_names.material_offsets],
						Object.keys(this.original_struct_descriptor).length,
					);

				static used_instance = null;



				constructor (addr)
				{
					super(addr);



					this.original_struct = Material.getOriginalStruct(this.addr);



					this.topology = this.constructor.TOPOLOGY[this.original_struct.topology];
					this.front_face = this.constructor.FRONT_FACE[this.original_struct.front_face];

					// this.uniforms
					// this.uniform_blocks
				}
			}

			this.Material = Material;



			class _Object extends Base
			{
				constructor (addr)
				{
					super(addr);



					this.scene_vertex_data_offset = wasm_wrapper.SizeT(addr + (WasmWrapper.PTR_SIZE * 2));
					this.scene_vertex_data_length = wasm_wrapper.SizeT(addr + (WasmWrapper.PTR_SIZE * 3));
					this.vertex_data = wasm_wrapper.StdVectorFloat(addr + (WasmWrapper.PTR_SIZE * 4));
				}
			}

			this.Object = _Object;



			class Scene extends Base
			{
				constructor (addr)
				{
					super(addr);



					this.vertex_data = wasm_wrapper.StdVectorFloat(addr + (WasmWrapper.PTR_SIZE * 2));
				}
			}

			this.Scene = Scene;
		}
	}
}
