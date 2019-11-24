package com.yogesh.automation.dataStructure;

import java.util.Arrays;

public class ArraySingleElement {

	public static void main(String[] args) {
		ArraySingleElement obj = new ArraySingleElement();
		int[] arr = { 2, 2, 3, 3, 3, 4, 5, 5, 3,2};
		obj.singleElement(arr);
	}

	public void singleElement(int[] arr) {
		System.out.println("before sort " + Arrays.toString(arr));
		Arrays.sort(arr);
		System.out.println("after sort " + Arrays.toString(arr));
		
		int len=arr.length;
		for(int i=0; i< len; ) {
			if(arr[i]==arr[i+1]) {
				i++;
			}
		}

	}

}
