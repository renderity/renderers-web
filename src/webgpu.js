/*
eslint-disable

no-undefined,
*/



import glslang from '@webgpu/glslang/dist/web-devel-onefile/glslang.js';



const getWebgpu =
({
	wasm_wrapper,
	RendererBase,
	UniformBase,
	UniformBlockBase,
	StorageBlockBase,
	DescriptorSetBase,
	MaterialBase,
	ObjectBase,
	SceneBase,
}) =>
{
	class WebGPU
	{
		constructor ()
		{
			const WasmWrapper = wasm_wrapper.constructor;



			class Renderer extends RendererBase
			{
				// dpr
				constructor (addr_renderer, options)
				{
					super(addr_renderer);

					this.exists = true;



					/* eslint-disable-next-line consistent-this */
					const renderer = this;



					this.canvas = options.canvas || document.createElement('canvas');

					this.canvas.width = this.original_struct.width[0];
					this.canvas.height = this.original_struct.height[0];

					this.canvas.style.width = `${ this.original_struct.width[0] }px`;
					this.canvas.style.height = `${ this.original_struct.height[0] }px`;

					this._context = this.canvas.getContext('webgpu');

					if (!this._context || !global.navigator.gpu)
					{
						this.exists = false;

						return undefined;
					}



					this.gpu_resources = [];



					this.loop_function = null;
					this.loop_function_wrapper = null;



					this.adapter = null;
					this.device = null;
					this.render_format = options.render_format;

					this.render_pass_encoder = null;



					this.glslang = null;



					class Uniform extends UniformBase
					{}

					this.Uniform = Uniform;



					class DescriptorBinding
					{
						static VISIBILITY =
							[
								global.GPUShaderStage.VERTEX,
								global.GPUShaderStage.FRAGMENT,
								global.GPUShaderStage.COMPUTE,
							];
					}



					class UniformBlock extends UniformBlockBase
					{
						constructor (addr)
						{
							super(addr);



							this.getUniforms(renderer);

							this.buffer =
								renderer.device.createBuffer
								({
									size: this.buffer_length,

									usage:
									(
										global.GPUBufferUsage.COPY_DST |
										global.GPUBufferUsage.UNIFORM
										// global.GPUBufferUsage.COPY_SRC |
										// global.GPUBufferUsage.MAP_WRITE
									),
								});

							renderer.gpu_resources.push(this.buffer);

							// this.buffer.mapAsync(global.GPUMapMode.WRITE);

							this.entry =
							{
								binding: this.original_struct.binding[0],

								resource:
								{
									buffer: this.buffer,
									offset: 0,
									size: this.buffer_length,
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding: this.original_struct.binding[0],

								visibility: this.getBitMask('visibility', DescriptorBinding.VISIBILITY),

								buffer:
								{
									type: 'uniform',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};



							this.use();
						}

						use ()
						{
							for
							(
								let uniform_index = 0;
								uniform_index < this.uniforms_seq.length;
								++uniform_index
							)
							{
								const uniform = this.uniforms_seq[uniform_index];

								// This is analog for vkCmdUpdateBuffer.
								// So it is recommended for updating small amounts of data.
								// May be keep buffer mapped and apdate data with TypedArray.set?
								renderer.device.queue.writeBuffer
								(
									this.buffer,
									uniform.original_struct.block_index[0],
									uniform._data,
									0,
									uniform._data.length,
								);
							}
						}
					}

					this.UniformBlock = UniformBlock;



					class StorageBlock extends StorageBlockBase
					{
						constructor (addr)
						{
							super(addr);



							this.buffer =
								renderer.device.createBuffer
								({
									size: this.original_struct.size[0],

									usage:
									(
										global.GPUBufferUsage.COPY_DST |
										global.GPUBufferUsage.STORAGE
										// global.GPUBufferUsage.COPY_SRC |
										// global.GPUBufferUsage.MAP_WRITE
									),
								});

							renderer.gpu_resources.push(this.buffer);

							// this.buffer.mapAsync(global.GPUMapMode.WRITE);

							this.entry =
							{
								binding: this.original_struct.binding[0],

								resource:
								{
									buffer: this.buffer,
									offset: 0,
									size: this.original_struct.size[0],
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding: this.original_struct.binding[0],

								visibility: this.getBitMask('visibility', DescriptorBinding.VISIBILITY),

								buffer:
								{
									type: 'read-only-storage',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};



							renderer.device.queue.writeBuffer
							(this.buffer, 0, this._data, 0, this._data.length);
						}

						use ()
						{}
					}

					this.StorageBlock = StorageBlock;



					class StorageBlock2
					{
						constructor (buffer, binding, size)
						{
							// renderer.gpu_resources.push(buffer);

							// buffer.mapAsync(global.GPUMapMode.WRITE);

							this.entry =
							{
								binding,

								resource:
								{
									buffer,
									offset: 0,
									size,
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding,

								visibility:
								(
									global.GPUShaderStage.FRAGMENT |
									global.GPUShaderStage.COMPUTE
								),

								buffer:
								{
									type: 'read-only-storage',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};
						}

						use ()
						{}
					}

					this.StorageBlock2 = StorageBlock2;



					class StorageBlock3
					{
						constructor (_data, binding, buffer_size = _data.byteLength, resource_size = _data.byteLength)
						{
							const buffer =
								renderer.device.createBuffer
								({
									size: buffer_size,

									usage:
									(
										window.GPUBufferUsage.COPY_DST |
										window.GPUBufferUsage.STORAGE
									),
								});

							// buffer.mapAsync(global.GPUMapMode.WRITE);

							renderer.gpu_resources.push(buffer);

							renderer.device.queue.writeBuffer
							(
								buffer,
								0,
								_data,
								0,
								_data.length,
							);

							this.entry =
							{
								binding,

								resource:
								{
									buffer,
									offset: 0,
									size: resource_size,
								},
							};

							// rename to layout
							this.entry_layout =
							{
								binding,

								visibility:
								(
									global.GPUShaderStage.FRAGMENT |
									global.GPUShaderStage.COMPUTE
								),

								buffer:
								{
									type: 'read-only-storage',
									hasDynamicOffset: false,
									minBindingSize: 0,
								},
							};
						}

						use ()
						{}
					}

					this.StorageBlock3 = StorageBlock3;



					// Descriptor set is a bind group in vulkan terms.
					class DescriptorSet extends DescriptorSetBase
					{
						static BINDING_TYPE =
							{
								UNIFORM_BLOCK: 0,
								STORAGE_BLOCK: 1,
							};



						constructor (addr)
						{
							super(addr);



							this.binding_seq = [];
							this.binding_dict = {};

							const bind_group_layout_descriptor =
							{
								entryCount: 0,
								entries: [],
							};

							this.bind_group_descriptor =
							{
								layout: null,

								entryCount: 0,
								entries: [],
							};

							this.original_struct.bindings.forEach
							(
								(binding_addr) =>
								{
									let binding = null;

									switch (wasm_wrapper.Size(this.getMemberAddr('type')))
									{
									case DescriptorSet.BINDING_TYPE.UNIFORM_BLOCK:
									{
										binding = UniformBlock.getInstance(binding_addr);

										break;
									}

									case DescriptorSet.BINDING_TYPE.STORAGE_BLOCK:
									{
										binding = StorageBlock.getInstance(binding_addr);

										break;
									}

									default:
									}

									bind_group_layout_descriptor.entries.push(binding.entry_layout);

									++bind_group_layout_descriptor.entryCount;

									this.bind_group_descriptor.entries.push(binding.entry);

									++this.bind_group_descriptor.entryCount;

									this.binding_seq.push(binding);
									this.binding_dict[binding.name] = binding;
								},
							);



							const bind_group_layout =
								renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

							this.bind_group_descriptor.layout = bind_group_layout;

							this.bind_group =
								renderer.device.createBindGroup(this.bind_group_descriptor);



							// use();
						}

						use (bind_group_index)
						{
							renderer.render_pass_encoder.setBindGroup(bind_group_index, this.bind_group, []);

							// use for loop
							this.binding_seq.forEach((binding) => binding.use());
						}
					}

					this.DescriptorSet = DescriptorSet;



					class DescriptorSet2
					{
						constructor (bindings)
						{
							this.binding_seq = [];
							this.binding_dict = {};

							const bind_group_layout_descriptor =
							{
								entryCount: 0,
								entries: [],
							};

							this.bind_group_descriptor =
							{
								layout: null,

								entryCount: 0,
								entries: [],
							};

							bindings.forEach
							(
								(binding) =>
								{
									// LOG(binding.entry_layout)
									bind_group_layout_descriptor.entries.push(binding.entry_layout);

									++bind_group_layout_descriptor.entryCount;

									this.bind_group_descriptor.entries.push(binding.entry);

									++this.bind_group_descriptor.entryCount;

									this.binding_seq.push(binding);
									this.binding_dict[binding.name] = binding;
								},
							);



							const bind_group_layout =
								renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

							this.bind_group_descriptor.layout = bind_group_layout;

							this.bind_group =
								renderer.device.createBindGroup(this.bind_group_descriptor);



							// use();
						}

						use (bind_group_index)
						{
							renderer.render_pass_encoder.setBindGroup(bind_group_index, this.bind_group, []);

							// use for loop
							this.binding_seq.forEach((binding) => binding.use());
						}
					}

					this.DescriptorSet2 = DescriptorSet2;



					class Material extends MaterialBase
					{
						static TOPOLOGY =
							[
								'triangle-list',
								'point-list',
								'line-list',
								'triangle-strip',
								'line-strip',
							];

						static FRONT_FACE =
							[
								'ccw',
								'cw',
							];

						static BLEND_ENABLED =
							[
								false,
								true,
							];

						static BLEND_FACTOR =
							[
								'zero',
								'one',
							];

						static BLEND_OP =
							[
								'add',
								'subtract',
								'reverse-subtract',
								'min',
								'max',
							];

						static ShaderUsage =
							{
								SPIRV: 0,
								GLSL: 1,
								WGSL: 2,
							};



						constructor (addr, shader_usage = Material.ShaderUsage.WGSL, descriptor_sets = [])
						{
							super(addr);



							const pipeline_configuration =
							{
								layout: null,

								vertex:
								{
									module: null,
									entryPoint: 'main',
									// record<USVString, GPUPipelineConstantValue> constants,

									bufferCount: 1,

									buffers:
									[
										{
											arrayStride: 12,
											stepMode: 'vertex',

											attributeCount: 1,

											attributes:
											[
												{
													format: 'float32x3',
													offset: 0,
													shaderLocation: 0,
												},
											],
										},
									],
								},

								primitive:
								{
									frontFace: this.front_face,
									topology: this.topology,
								},

								fragment:
								{
									module: null,
									entryPoint: 'main',

									targetCount: 1,

									targets:
									[
										{
											format: renderer.render_format,

											blend:
											(
												this.blend_enabled ?

													{
														color:
														{
															operation: this.blend_color_op,
															srcFactor: this.blend_color_factor_src,
															dstFactor: this.blend_color_factor_dst,
														},

														alpha:
														{
															operation: this.blend_alpha_op,
															srcFactor: this.blend_alpha_factor_src,
															dstFactor: this.blend_alpha_factor_dst,
														},
													} :

													undefined
											),

											// GPUColorWriteFlags writeMask = 0xF;  // GPUColorWrite.ALL
										},
									],
								},
							};



							{
								let code_vertex = null;
								let code_fragment = null;



								switch (shader_usage)
								{
								case Material.ShaderUsage.SPIRV:
								{
									// Wrap spirv code Uint32Array to another Uint32Array
									// since the provided array must not be shared.
									code_vertex = new Uint32Array(this.original_struct.code_vertex_spirv);
									code_fragment = new Uint32Array(this.original_struct.code_fragment_spirv);

									break;
								}

								case Material.ShaderUsage.GLSL:
								{
									{
										const code_glsl =
											WasmWrapper.convertUint8ArrayToDomString
											(this.original_struct.code_vertex_glsl);

										try
										{
											code_vertex =
												renderer.glslang.compileGLSL(code_glsl, 'vertex');
										}
										catch (_error)
										{
											LOG
											(
												code_glsl.split('\n')
													.map
													((line, line_index) => `${ line_index + 1 }${ line }`).join('\n'),
											);

											console.error(_error);
										}
									}

									{
										const code_glsl =
											WasmWrapper.convertUint8ArrayToDomString
											(this.original_struct.code_fragment_glsl);

										try
										{
											code_fragment = renderer.glslang.compileGLSL(code_glsl, 'fragment');
										}
										catch (_error)
										{
											LOG
											(
												code_glsl.split('\n')
													.map
													((line, line_index) => `${ line_index + 1 }${ line }`).join('\n'),
											);

											console.error(_error);
										}
									}

									break;
								}

								case Material.ShaderUsage.WGSL:
								{
									code_vertex =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.code_vertex_wgsl);

									code_fragment =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.code_fragment_wgsl);

									break;
								}

								default:
								}



								const shader_module_vertex = renderer.device.createShaderModule({ code: code_vertex });

								pipeline_configuration.vertex.module = shader_module_vertex;

								const shader_module_fragment =
									renderer.device.createShaderModule({ code: code_fragment });

								pipeline_configuration.fragment.module = shader_module_fragment;
							}



							this.descriptor_sets = [];

							const pipeline_layout_descriptor =
							{
								bindGroupLayouts: [],
							};

							this.original_struct.descriptor_sets.forEach
							(
								(descriptor_set_addr) =>
								{
									const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

									pipeline_layout_descriptor.bindGroupLayouts.push
									(descriptor_set.bind_group_descriptor.layout);

									this.descriptor_sets.push(descriptor_set);
								},
							);

							descriptor_sets.forEach
							(
								(descriptor_set) =>
								{
									pipeline_layout_descriptor.bindGroupLayouts.push
									(descriptor_set.bind_group_descriptor.layout);

									this.descriptor_sets.push(descriptor_set);
								},
							);

							pipeline_configuration.layout =
								renderer.device.createPipelineLayout(pipeline_layout_descriptor);



							this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
						}

						use ()
						{
							Material.used_instance = this;

							// Use dedicated_descriptor_set?

							renderer.render_pass_encoder.setPipeline(this.pipeline);
						}
					}

					this.Material = Material;



					class ComputePipeline
					{
						constructor (addr, shader_usage = Material.ShaderUsage.WGSL)
						{
							// super(addr);



							const pipeline_configuration =
							{
								layout: null,
							};



							{
								let code = null;



								switch (shader_usage)
								{
								case Material.ShaderUsage.SPIRV:
								{
									code = new Uint32Array(this.original_struct.code_spirv_compute);

									break;
								}

								case Material.ShaderUsage.GLSL:
								{
									const code_glsl =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.code_compute_glsl);

									try
									{
										code = renderer.glslang.compileGLSL(code_glsl, 'compute');
									}
									catch (_error)
									{
										LOG
										(
											code_glsl.split('\n')
												.map
												((line, line_index) => `${ line_index + 1 }${ line }`).join('\n'),
										);

										console.error(_error);
									}

									break;
								}

								case Material.ShaderUsage.WGSL:
								{
									code =
										WasmWrapper.convertUint8ArrayToDomString
										(this.original_struct.code_wgsl_compute);

									break;
								}

								default:
								}



								const shader_module = renderer.device.createShaderModule({ code });

								pipeline_configuration.vertex.module = shader_module;
							}



							this.descriptor_sets = [];

							const pipeline_layout_descriptor =
							{
								bindGroupLayouts: [],
							};

							this.original_struct.descriptor_sets.forEach
							(
								(descriptor_set_addr) =>
								{
									const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

									pipeline_layout_descriptor.bindGroupLayouts.push
									(descriptor_set.bind_group_descriptor.layout);

									this.descriptor_sets.push(descriptor_set);
								},
							);

							pipeline_configuration.layout =
								renderer.device.createPipelineLayout(pipeline_layout_descriptor);



							this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
						}

						use ()
						{
							// Use dedicated_descriptor_set?

							renderer.render_pass_encoder.setPipeline(this.pipeline);
						}
					}

					this.ComputePipeline = ComputePipeline;



					class _Object extends ObjectBase
					{
						draw ()
						{
							renderer.render_pass_encoder.draw
							(
								this.original_struct.scene_position_data_length[0],
								1,
								this.original_struct.scene_position_data_offset[0],
								0,
							);
						}

						drawIndexed ()
						{
							renderer.render_pass_encoder.drawIndexed
							(
								this.original_struct.scene_index_data_length[0],
								1,
								this.original_struct.scene_index_data_offset[0],
								0,
								0,
							);
						}

						draw2 ()
						{
							renderer.render_pass_encoder.draw
							(this.original_struct.position_data.length / 3, 1, 0, 0);
						}

						drawIndexed2 ()
						{
							renderer.render_pass_encoder.drawIndexed
							(this.original_struct.index_data.length / 3, 1, 0, 0, 0);
						}

						// draw2 ()
						// {
						// 	renderer.render_pass_encoder.draw
						// 	(this.original_struct.position_data.length, 1, 0, 0);
						// }

						// drawIndexed2 ()
						// {
						// 	renderer.render_pass_encoder.drawIndexed
						// 	(this.original_struct.index_data.length, 1, 0, 0, 0);
						// }

						createBuffers ()
						{
							this.position_buffer =
								renderer.device.createBuffer
								({
									size: this.original_struct.position_data.byteLength,

									usage:
									(
										window.GPUBufferUsage.COPY_DST |
										window.GPUBufferUsage.VERTEX
									),
								});

							renderer.gpu_resources.push(this.position_buffer);

							renderer.device.queue.writeBuffer
							(
								this.position_buffer,
								0,
								this.original_struct.position_data,
								0,
								this.original_struct.position_data.length,
							);



							this.normal_buffer =
								renderer.device.createBuffer
								({
									size: this.original_struct.normal_data.byteLength,

									usage:
									(
										window.GPUBufferUsage.COPY_DST |
										window.GPUBufferUsage.VERTEX
									),
								});

							renderer.gpu_resources.push(this.normal_buffer);

							renderer.device.queue.writeBuffer
							(
								this.normal_buffer,
								0,
								this.original_struct.normal_data,
								0,
								this.original_struct.normal_data.length,
							);



							this.index_buffer =
								renderer.device.createBuffer
								({
									size: this.original_struct.index_data.byteLength,

									usage:
									(
										window.GPUBufferUsage.COPY_DST |
										window.GPUBufferUsage.INDEX
									),
								});

							renderer.gpu_resources.push(this.index_buffer);

							renderer.device.queue.writeBuffer
							(
								this.index_buffer,
								0,
								this.original_struct.index_data,
								0,
								this.original_struct.index_data.length,
							);
						}
					}

					this.Object = _Object;



					class Scene extends SceneBase
					{
						constructor (addr)
						{
							super(addr);



							// this.position_buffer =
							// 	renderer.device.createBuffer
							// 	({
							// 		size: this.original_struct.position_data.byteLength,

							// 		usage:
							// 		(
							// 			window.GPUBufferUsage.COPY_DST |
							// 			window.GPUBufferUsage.VERTEX
							// 		),
							// 	});

							// renderer.gpu_resources.push(this.position_buffer);

							// renderer.device.queue.writeBuffer
							// (
							// 	this.position_buffer,
							// 	0,
							// 	this.original_struct.position_data,
							// 	0,
							// 	this.original_struct.position_data.length,
							// );



							// this.index_buffer =
							// 	renderer.device.createBuffer
							// 	({
							// 		size: this.original_struct.index_data.byteLength,

							// 		usage:
							// 		(
							// 			window.GPUBufferUsage.COPY_DST |
							// 			window.GPUBufferUsage.INDEX
							// 		),
							// 	});

							// renderer.gpu_resources.push(this.index_buffer);

							// renderer.device.queue.writeBuffer
							// (
							// 	this.index_buffer,
							// 	0,
							// 	this.original_struct.index_data,
							// 	0,
							// 	this.original_struct.index_data.length,
							// );
						}

						makeDescriptorSet (bindings = [])
						{
							this.position_storage_block = new StorageBlock3(this.original_struct.position_data, 0);
							this.index_storage_block = new StorageBlock3(this.original_struct.index_data, 2);

							this.descriptor_set =
								new DescriptorSet2
								([
									this.position_storage_block,
									this.index_storage_block,

									...bindings,
								]);
						}
					}

					this.Scene = Scene;
				}

				async init ()
				{
					this.glslang = await glslang();

					if (!navigator.gpu)
					{
						return null;
					}

					this.adapter = await navigator.gpu.requestAdapter();

					if (!this.adapter)
					{
						return null;
					}

					this.device = await this.adapter.requestDevice();

					if (!this.render_format)
					{
						this.render_format = this._context.getPreferredFormat(this.adapter);
					}

					this._context.configure
					({
						device: this.device,
						format: this.render_format,
						usage: global.GPUTextureUsage.RENDER_ATTACHMENT,
						// GPUPredefinedColorSpace colorSpace = "srgb";
						// GPUCanvasCompositingAlphaMode compositingAlphaMode = "opaque";

						size:
						{
							width: this.original_struct.width[0],
							height: this.original_struct.height[0],
							depthOrArrayLayers: 1,
						},
						// size: [ 800, 600 ],
					});

					return this.adapter;
				}

				startLoop ()
				{
					this.loop_function_wrapper = () =>
					{
						this.loop_function();

						this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
					};

					this.animation_frame = requestAnimationFrame(this.loop_function_wrapper);
				}

				endLoop ()
				{
					cancelAnimationFrame(this.animation_frame);
				}

				destroy ()
				{
					this.loop_function = null;
					this.loop_function_wrapper = null;

					this.gpu_resources
						.reverse()
						.forEach
						(
							(handle) =>
							{
								handle.destroy();
							},
						);

					this.Uniform.instances = null;
					this.UniformBlock.instances = null;
					this.StorageBlock.instances = null;
					this.DescriptorSet.instances = null;
					this.Material.instances = null;
				}
			}

			this.Renderer = Renderer;
		}
	}

	return WebGPU;
};

export default getWebgpu;
